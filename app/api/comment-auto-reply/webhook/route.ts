import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN

// GET — Meta webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST — handle incoming comment events from Facebook & Instagram
export async function POST(request: NextRequest) {
  const body = await request.json()

  // Meta sends { object: 'page' | 'instagram', entry: [...] }
  const platform = body.object === 'instagram' ? 'instagram' : 'facebook'

  if (!body.entry || !Array.isArray(body.entry)) {
    return NextResponse.json({ received: true })
  }

  for (const entry of body.entry) {
    const changes = entry.changes || []

    for (const change of changes) {
      // Facebook: field === 'feed', value.item === 'comment'
      // Instagram: field === 'comments'
      if (
        (platform === 'facebook' && change.field === 'feed' && change.value?.item === 'comment') ||
        (platform === 'instagram' && change.field === 'comments')
      ) {
        const value = change.value || {}

        // Extract comment data based on platform
        const commentData = {
          post_id: platform === 'facebook'
            ? value.post_id
            : value.media?.id || value.media_id,
          comment_id: platform === 'facebook'
            ? value.comment_id
            : value.id,
          commenter_id: platform === 'facebook'
            ? value.from?.id || value.sender_id
            : value.from?.id,
          commenter_name: platform === 'facebook'
            ? value.from?.name
            : value.from?.username,
          comment_text: platform === 'facebook'
            ? value.message
            : value.text,
        }

        // Skip if missing critical data
        if (!commentData.post_id || !commentData.comment_text || !commentData.commenter_id) {
          continue
        }

        // Skip comments from the page itself
        const pageId = entry.id
        if (commentData.commenter_id === pageId) {
          continue
        }

        await processComment(platform, commentData, pageId)
      }
    }
  }

  return NextResponse.json({ received: true })
}

async function processComment(
  platform: string,
  comment: {
    post_id: string
    comment_id: string
    commenter_id: string
    commenter_name?: string
    comment_text: string
  },
  pageId: string
) {
  const commentTextLower = comment.comment_text.toLowerCase().trim()

  // Find matching active rules for this post
  const { data: rules } = await supabaseAdmin
    .from('comment_auto_replies')
    .select('*')
    .eq('platform', platform)
    .eq('post_id', comment.post_id)
    .eq('is_active', true)

  if (!rules || rules.length === 0) return

  for (const rule of rules) {
    const keyword = (rule.keyword || '').toLowerCase().trim()

    // Check if comment contains the keyword
    if (!commentTextLower.includes(keyword)) continue

    let dmSent = false
    let publicReplySent = false
    let error: string | null = null

    const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN

    if (!pageAccessToken) {
      error = 'Missing META_PAGE_ACCESS_TOKEN'
    } else {
      // Send DM to the commenter
      try {
        if (platform === 'facebook') {
          // Facebook: send via Page Messaging
          const dmRes = await fetch(
            `https://graph.facebook.com/v18.0/${pageId}/messages`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipient: { id: comment.commenter_id },
                message: { text: rule.dm_message },
                messaging_type: 'RESPONSE',
                access_token: pageAccessToken,
              }),
            }
          )
          dmSent = dmRes.ok
          if (!dmRes.ok) {
            const errData = await dmRes.json()
            error = errData.error?.message || 'Failed to send Facebook DM'
          }
        } else {
          // Instagram: send via Instagram Messaging API
          const dmRes = await fetch(
            `https://graph.facebook.com/v18.0/${pageId}/messages`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipient: { id: comment.commenter_id },
                message: { text: rule.dm_message },
                access_token: pageAccessToken,
              }),
            }
          )
          dmSent = dmRes.ok
          if (!dmRes.ok) {
            const errData = await dmRes.json()
            error = errData.error?.message || 'Failed to send Instagram DM'
          }
        }
      } catch (err) {
        error = `DM send error: ${err instanceof Error ? err.message : 'Unknown'}`
      }

      // Send public reply if configured
      if (rule.public_reply) {
        try {
          const replyRes = await fetch(
            `https://graph.facebook.com/v18.0/${comment.comment_id}/replies`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: rule.public_reply,
                access_token: pageAccessToken,
              }),
            }
          )
          publicReplySent = replyRes.ok
        } catch {
          // Public reply failure is non-critical
        }
      }
    }

    // Increment usage count
    try {
      await supabaseAdmin.rpc('increment_counter', {
        row_id: rule.id,
        table_name: 'comment_auto_replies',
        column_name: 'usage_count',
      }).then(() => {
        // If RPC doesn't exist, fallback to manual update
      })
    } catch {
      // Fallback: direct update
      await supabaseAdmin
        .from('comment_auto_replies')
        .update({ usage_count: (rule.usage_count || 0) + 1 })
        .eq('id', rule.id)
    }

    // Log the action
    try {
      await supabaseAdmin.from('comment_auto_reply_logs').insert({
        rule_id: rule.id,
        platform,
        post_id: comment.post_id,
        comment_id: comment.comment_id,
        commenter_id: comment.commenter_id,
        commenter_name: comment.commenter_name || null,
        comment_text: comment.comment_text,
        keyword_matched: keyword,
        dm_sent: dmSent,
        public_reply_sent: publicReplySent,
        error,
      })
    } catch { /* silent */ }

    // Only trigger the first matching rule per comment
    break
  }
}
