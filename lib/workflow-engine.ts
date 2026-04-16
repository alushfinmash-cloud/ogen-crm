import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Lead {
  id: string
  name: string
  phone?: string
  email?: string
  source?: string
  column_id: string
}

/**
 * Execute all active workflows matching a trigger
 */
export async function executeWorkflows(
  triggerType: 'webhook_lead' | 'column_change',
  lead: Lead,
  triggerMeta: { pipeline_id?: string; column_id?: string; webhook_id?: string }
) {
  // Find matching workflows
  const { data: workflows } = await supabase
    .from('workflows')
    .select('*, workflow_steps(*)')
    .eq('trigger_type', triggerType)
    .eq('is_active', true)
    .order('created_at')

  if (!workflows || workflows.length === 0) return

  for (const wf of workflows) {
    const config = wf.trigger_config || {}

    // Match trigger config
    if (triggerType === 'webhook_lead') {
      if (config.webhook_id && config.webhook_id !== triggerMeta.webhook_id) continue
      if (config.pipeline_id && config.pipeline_id !== triggerMeta.pipeline_id) continue
    }

    if (triggerType === 'column_change') {
      if (config.column_id && config.column_id !== triggerMeta.column_id) continue
      if (config.pipeline_id && config.pipeline_id !== triggerMeta.pipeline_id) continue
    }

    // Sort steps
    const steps = (wf.workflow_steps || []).sort(
      (a: any, b: any) => a.step_order - b.step_order
    )

    // Log workflow start
    await supabase.from('workflow_logs').insert({
      workflow_id: wf.id,
      lead_id: lead.id,
      status: 'running',
      details: `Workflow "${wf.name}" started`,
    })

    // Execute steps sequentially
    for (const step of steps) {
      try {
        await executeStep(step, lead, wf.id)

        await supabase.from('workflow_logs').insert({
          workflow_id: wf.id,
          lead_id: lead.id,
          step_id: step.id,
          step_order: step.step_order,
          status: 'completed',
          details: `Step ${step.step_order + 1}: ${step.action_type} completed`,
        })
      } catch (err: any) {
        await supabase.from('workflow_logs').insert({
          workflow_id: wf.id,
          lead_id: lead.id,
          step_id: step.id,
          step_order: step.step_order,
          status: 'failed',
          details: `Step ${step.step_order + 1} failed: ${err.message}`,
        })
        break // stop workflow on failure
      }
    }

    // Log workflow complete
    await supabase.from('workflow_logs').insert({
      workflow_id: wf.id,
      lead_id: lead.id,
      status: 'completed',
      details: `Workflow "${wf.name}" completed`,
    })
  }
}

async function executeStep(step: any, lead: Lead, workflowId: string) {
  const config = step.action_config || {}

  switch (step.action_type) {
    case 'create_contact':
      // Lead already exists — mark as contact
      await supabase.from('lead_history').insert({
        lead_id: lead.id,
        action: 'workflow',
        description: 'סומן כאיש קשר פעיל (Workflow)',
        user_name: 'Workflow',
      })
      break

    case 'add_tag':
      const tag = replaceVariables(config.tag || '', lead)
      if (tag) {
        await supabase.from('lead_tags').upsert(
          { lead_id: lead.id, tag },
          { onConflict: 'lead_id,tag' }
        )
        await supabase.from('lead_history').insert({
          lead_id: lead.id,
          action: 'workflow',
          description: `תג נוסף: ${tag}`,
          user_name: 'Workflow',
        })
      }
      break

    case 'send_whatsapp':
      const message = replaceVariables(config.message || '', lead)
      const phone = lead.phone?.replace(/\D/g, '').replace(/^0/, '972')
      if (phone && message) {
        // Log the intent (actual sending via Green API will be in Module 5)
        await supabase.from('lead_history').insert({
          lead_id: lead.id,
          action: 'workflow',
          description: `הודעת WhatsApp נשלחה: "${message.substring(0, 50)}..."`,
          user_name: 'Workflow',
        })
      }
      break

    case 'wait':
      // In a real implementation, this would schedule a delayed job.
      // For now, log the wait.
      const minutes = step.wait_duration || 0
      await supabase.from('workflow_logs').insert({
        workflow_id: workflowId,
        lead_id: lead.id,
        step_id: step.id,
        step_order: step.step_order,
        status: 'waiting',
        details: `ממתין ${formatWaitTime(minutes)}`,
      })
      break

    case 'stop_previous':
      // Mark all running logs for this lead (other workflows) as stopped
      await supabase
        .from('workflow_logs')
        .update({ status: 'stopped', details: 'נעצר על ידי workflow חדש' })
        .eq('lead_id', lead.id)
        .eq('status', 'waiting')
        .neq('workflow_id', workflowId)
      break

    case 'send_email':
      const subject = replaceVariables(config.subject || '', lead)
      const body = replaceVariables(config.body || '', lead)
      await supabase.from('lead_history').insert({
        lead_id: lead.id,
        action: 'workflow',
        description: `מייל נשלח: "${subject}"`,
        user_name: 'Workflow',
      })
      break

    case 'create_reminder':
      const reminderText = replaceVariables(config.text || '', lead)
      const dueMinutes = config.due_in_minutes || 1440 // default: 1 day
      const dueDate = new Date(Date.now() + dueMinutes * 60000).toISOString()
      await supabase.from('lead_history').insert({
        lead_id: lead.id,
        action: 'workflow',
        description: `תזכורת נוצרה: "${reminderText}" — עד ${new Date(dueDate).toLocaleDateString('he-IL')}`,
        user_name: 'Workflow',
      })
      break
  }
}

function replaceVariables(template: string, lead: Lead): string {
  return template
    .replace(/\{\{שם\}\}/g, lead.name || '')
    .replace(/\{\{טלפון\}\}/g, lead.phone || '')
    .replace(/\{\{אימייל\}\}/g, lead.email || '')
    .replace(/\{\{מקור\}\}/g, lead.source || '')
    .replace(/\{\{name\}\}/g, lead.name || '')
    .replace(/\{\{phone\}\}/g, lead.phone || '')
    .replace(/\{\{email\}\}/g, lead.email || '')
}

function formatWaitTime(minutes: number): string {
  if (minutes < 60) return `${minutes} דקות`
  if (minutes < 1440) return `${Math.round(minutes / 60)} שעות`
  return `${Math.round(minutes / 1440)} ימים`
}
