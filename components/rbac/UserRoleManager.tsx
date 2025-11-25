'use client'

import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, X, Plus, Users, Mail, Shield, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { RoleSelector, RoleBadge } from './RoleSelector'
import { assignRoleAction, removeRoleAction } from '@/app/(protected)/settings/roles/actions'
import { useJobRoleAssignments, useCurrentUserWithRoles } from '@/lib/hooks/useRbac'
import type { UserWithRoles, JobRoleAssignment, RoleAssignmentParams, RoleName } from '@/lib/types'

interface UserRoleManagerProps {
  jobId?: string
  currentAssignments?: JobRoleAssignment[]
  onUpdate?: () => void
  excludeRoles?: RoleName[]
}

interface UserSearchResult {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
    name?: string
    avatar_url?: string
  }
}

export function UserRoleManager({
  jobId,
  currentAssignments = [],
  onUpdate,
  excludeRoles = []
}: UserRoleManagerProps) {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: currentUser } = useCurrentUserWithRoles()

  // Get current assignments for the job
  const { data: jobAssignments, isLoading: assignmentsLoading } = useJobRoleAssignments(jobId || '')

  const assignRoleMutation = useMutation({
    mutationFn: (params: RoleAssignmentParams) => assignRoleAction(params),
    onSuccess: () => {
      toast({
        title: 'Role assigned successfully',
        description: 'The user has been assigned the selected role.',
      })
      setIsAssignDialogOpen(false)
      setSelectedUserId('')
      setSelectedRoleId('')
      setSearchQuery('')
      setSearchResults([])
      queryClient.invalidateQueries({ queryKey: ['jobRoleAssignments', jobId] })
      onUpdate?.()
    },
    onError: (error) => {
      toast({
        title: 'Error assigning role',
        description: error.message || 'Failed to assign role. Please try again.',
        variant: 'destructive',
      })
    }
  })

  const removeRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      removeRoleAction(userId, roleId, jobId),
    onSuccess: () => {
      toast({
        title: 'Role removed successfully',
        description: 'The user role has been removed.',
      })
      queryClient.invalidateQueries({ queryKey: ['jobRoleAssignments', jobId] })
      onUpdate?.()
    },
    onError: (error) => {
      toast({
        title: 'Error removing role',
        description: error.message || 'Failed to remove role. Please try again.',
        variant: 'destructive',
      })
    }
  })

  // Search users
  const handleSearchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch('/api/users/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.users || [])
      } else {
        console.error('Error searching users')
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      handleSearchUsers(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleAssignRole = () => {
    if (!selectedUserId || !selectedRoleId) {
      toast({
        title: 'Missing information',
        description: 'Please select both a user and a role.',
        variant: 'destructive',
      })
      return
    }

    const params: RoleAssignmentParams = {
      user_id: selectedUserId,
      role_id: selectedRoleId,
      job_id: jobId
    }

    assignRoleMutation.mutate(params)
  }

  const handleRemoveRole = (userId: string, roleId: string) => {
    removeRoleMutation.mutate({ userId, roleId })
  }

  const assignments = jobId ? jobAssignments || [] : currentAssignments
  const isLoading = jobId ? assignmentsLoading : false

  // Filter out users who are already assigned to this job
  const assignedUserIds = new Set(assignments.map(a => a.user_id))
  const availableUsers = searchResults.filter(user => !assignedUserIds.has(user.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Team Members</h3>
          <Badge variant="secondary">{assignments.length}</Badge>
        </div>

        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Assign Role
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Assign Role to User</DialogTitle>
              <DialogDescription>
                Search for a user and assign them a role{jobId ? ' for this job' : ''}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* User Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Users</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Search Results */}
              {searchQuery && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {isSearching ? (
                    <div className="text-sm text-muted-foreground">Searching...</div>
                  ) : availableUsers.length > 0 ? (
                    availableUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedUserId === user.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.user_metadata?.avatar_url} />
                          <AvatarFallback>
                            {user.user_metadata?.full_name?.[0] || user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {user.user_metadata?.full_name || user.user_metadata?.name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {user.email}
                          </div>
                        </div>
                        {selectedUserId === user.id && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))
                  ) : searchResults.length > 0 ? (
                    <div className="text-sm text-muted-foreground">
                      All matching users are already assigned
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No users found</div>
                  )}
                </div>
              )}

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Role</label>
                <RoleSelector
                  selectedRoleId={selectedRoleId}
                  onRoleChange={setSelectedRoleId}
                  excludeRoles={excludeRoles}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAssignDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignRole}
                  disabled={!selectedUserId || !selectedRoleId || assignRoleMutation.isPending}
                >
                  {assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Assignments */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading assignments...</div>
        ) : assignments.length > 0 ? (
          assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={assignment.user?.user_metadata?.avatar_url} />
                      <AvatarFallback>
                        {assignment.user?.user_metadata?.full_name?.[0] ||
                         assignment.user?.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {assignment.user?.user_metadata?.full_name ||
                         assignment.user?.user_metadata?.name ||
                         'Unknown User'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {assignment.user?.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {assignment.role && (
                      <RoleBadge role={assignment.role} size="sm" />
                    )}
                    {assignment.user?.id !== currentUser?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          assignment.role_id && assignment.user_id &&
                          handleRemoveRole(assignment.user_id, assignment.role_id)
                        }
                        disabled={removeRoleMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="mx-auto h-12 w-12 opacity-50 mb-3" />
            <p>No team members assigned yet</p>
            <p className="text-sm">Click "Assign Role" to add team members</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface QuickRoleAssignProps {
  userId: string
  userName: string
  userEmail: string
  userAvatar?: string
  currentRoleId?: string
  jobId?: string
  onRoleChange?: (newRoleId: string) => void
  excludeRoles?: RoleName[]
  size?: 'sm' | 'md'
}

export function QuickRoleAssign({
  userId,
  userName,
  userEmail,
  userAvatar,
  currentRoleId,
  jobId,
  onRoleChange,
  excludeRoles = [],
  size = 'md'
}: QuickRoleAssignProps) {
  const [selectedRoleId, setSelectedRoleId] = useState(currentRoleId || '')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const assignRoleMutation = useMutation({
    mutationFn: (params: RoleAssignmentParams) => assignRoleAction(params),
    onSuccess: () => {
      toast({
        title: 'Role updated successfully',
        description: `${userName}'s role has been updated.`,
      })
      queryClient.invalidateQueries({ queryKey: ['jobRoleAssignments', jobId] })
      onRoleChange?.(selectedRoleId)
    },
    onError: (error) => {
      toast({
        title: 'Error updating role',
        description: error.message || 'Failed to update role. Please try again.',
        variant: 'destructive',
      })
    }
  })

  const handleRoleChange = (newRoleId: string) => {
    setSelectedRoleId(newRoleId)

    const params: RoleAssignmentParams = {
      user_id: userId,
      role_id: newRoleId,
      job_id: jobId
    }

    assignRoleMutation.mutate(params)
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm'
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar className={size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'}>
        <AvatarImage src={userAvatar} />
        <AvatarFallback>{userName[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${sizeClasses[size]} truncate`}>{userName}</div>
        <div className={`text-muted-foreground ${sizeClasses[size]} truncate`}>{userEmail}</div>
      </div>
      <div className="min-w-0">
        <RoleSelector
          selectedRoleId={selectedRoleId}
          onRoleChange={handleRoleChange}
          excludeRoles={excludeRoles}
          placeholder={size === 'sm' ? '' : 'Select role'}
        />
      </div>
    </div>
  )
}