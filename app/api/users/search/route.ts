import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rbacService } from '@/lib/services/rbacService'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage users or assign roles
    const hasPermission = await rbacService.hasPermission({
      permission: 'users.manage',
      user_id: user.id
    })

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { query, limit = 10 } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid search query' }, { status: 400 })
    }

    // Search users by email or name
    const { data: users, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: limit
    })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
    }

    // Filter users based on search query
    const filteredUsers = users.users.filter(user => {
      const email = user.email?.toLowerCase() || ''
      const fullName = user.user_metadata?.full_name?.toLowerCase() || ''
      const name = user.user_metadata?.name?.toLowerCase() || ''
      const searchQuery = query.toLowerCase()

      return (
        email.includes(searchQuery) ||
        fullName.includes(searchQuery) ||
        name.includes(searchQuery)
      )
    }).slice(0, limit).map(user => ({
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at
    }))

    return NextResponse.json({ users: filteredUsers })
  } catch (error) {
    console.error('Error in user search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}