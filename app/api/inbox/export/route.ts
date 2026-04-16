import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


// GET — export conversation messages as CSV
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversation_id')
  const format = searchParams.get('format') || 'csv'

  if (!conversationId) {
    return NextResponse.json({ error: 'חסר conversation_id' }, { status: 400 })
  }

  // Get conversation info
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  if (!conv) {
    return NextResponse.json({ error: 'שיחה לא נמצאה' }, { status: 404 })
  }

  // Get all messages
  const { data: messages, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (format === 'csv') {
    // Build CSV
    const BOM = '\uFEFF' // UTF-8 BOM for Hebrew support in Excel
    const headers = ['תאריך,שעה,כיוון,שולח,ערוץ,תוכן,סטטוס']
    const rows = (messages || []).map(msg => {
      const date = new Date(msg.created_at)
      const dateStr = date.toLocaleDateString('he-IL')
      const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      const direction = msg.direction === 'in' ? 'נכנסת' : 'יוצאת'
      const content = `"${(msg.content || '').replace(/"/g, '""')}"`
      const status = msg.status || ''

      return `${dateStr},${timeStr},${direction},${msg.sender_name || ''},${msg.channel},${content},${status}`
    })

    const csv = BOM + headers.join('\n') + '\n' + rows.join('\n')
    const filename = `conversation_${conv.contact_name}_${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  if (format === 'text') {
    // Build readable text format
    let text = `═══════════════════════════════════════\n`
    text += `שיחה עם: ${conv.contact_name}\n`
    text += `ערוץ: ${conv.channel}\n`
    if (conv.contact_phone) text += `טלפון: ${conv.contact_phone}\n`
    if (conv.contact_email) text += `אימייל: ${conv.contact_email}\n`
    text += `תאריך ייצוא: ${new Date().toLocaleDateString('he-IL')}\n`
    text += `═══════════════════════════════════════\n\n`

    let lastDate = ''
    for (const msg of (messages || [])) {
      const date = new Date(msg.created_at)
      const dateStr = date.toLocaleDateString('he-IL')
      const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })

      if (dateStr !== lastDate) {
        text += `\n── ${dateStr} ──\n\n`
        lastDate = dateStr
      }

      const arrow = msg.direction === 'in' ? '←' : '→'
      const sender = msg.sender_name || (msg.direction === 'in' ? conv.contact_name : 'מנהל המערכת')
      text += `[${timeStr}] ${arrow} ${sender}:\n${msg.content}\n\n`
    }

    const filename = `conversation_${conv.contact_name}_${new Date().toISOString().slice(0, 10)}.txt`

    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // JSON format
  return NextResponse.json({
    conversation: conv,
    messages: messages || [],
    exported_at: new Date().toISOString(),
  })
}
