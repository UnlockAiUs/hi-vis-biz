/**
 * User Language Settings API
 * 
 * AI AGENT INSTRUCTIONS:
 * - GET: Returns user's current language preference
 * - PUT: Updates user's language preference
 * - Returns supported languages list
 * 
 * @see MASTER_PROJECT_CONTEXT.md for architecture
 * @see FEATURE_UPDATE_EXECUTION_PLAN.md Phase 4 for requirements
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SUPPORTED_LANGUAGES, isLanguageSupported, LanguageCode } from '@/lib/utils/translation'

// GET /api/user/language - Get current language preference and supported languages
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's membership with language preference
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('preferred_language_code, org_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (memberError) {
      console.error('Error fetching member:', memberError)
      return NextResponse.json({ error: 'Failed to fetch language settings' }, { status: 500 })
    }

    // Get org's translation setting if member exists
    let allowTranslation = true
    if (member?.org_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('allow_translation')
        .eq('id', member.org_id)
        .single()
      
      allowTranslation = org?.allow_translation ?? true
    }

    return NextResponse.json({
      currentLanguage: member?.preferred_language_code || 'en',
      allowTranslation,
      supportedLanguages: SUPPORTED_LANGUAGES.map(lang => ({
        code: lang.code,
        name: lang.name,
        nativeName: lang.nativeName
      }))
    })
  } catch (error) {
    console.error('GET /api/user/language error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/user/language - Update language preference
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { languageCode } = body as { languageCode: string }

    if (!languageCode) {
      return NextResponse.json({ error: 'languageCode is required' }, { status: 400 })
    }

    // Validate language code
    if (!isLanguageSupported(languageCode)) {
      return NextResponse.json({ 
        error: 'Unsupported language code',
        supportedLanguages: SUPPORTED_LANGUAGES.map(l => l.code)
      }, { status: 400 })
    }

    // Update the user's language preference
    const { data: member, error: updateError } = await supabase
      .from('organization_members')
      .update({ 
        preferred_language_code: languageCode,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('status', 'active')
      .select('id, preferred_language_code, org_id')
      .single()

    if (updateError) {
      console.error('Error updating language:', updateError)
      return NextResponse.json({ error: 'Failed to update language preference' }, { status: 500 })
    }

    // Log to audit_log
    if (member?.org_id) {
      await supabase.from('audit_log').insert({
        org_id: member.org_id,
        actor_type: 'owner',
        actor_id: user.id,
        entity_type: 'organization_member',
        entity_id: member.id,
        action: 'language_changed',
        details: { 
          new_language: languageCode,
          changed_by: 'user'
        }
      })
    }

    return NextResponse.json({
      success: true,
      languageCode: member?.preferred_language_code || languageCode
    })
  } catch (error) {
    console.error('PUT /api/user/language error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
