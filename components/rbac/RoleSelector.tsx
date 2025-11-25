'use client'

import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, Shield, Users, Eye, Wrench, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useAssignableRoles } from '@/lib/hooks/useRbac'
import type { Role, RoleName } from '@/lib/types'

interface RoleSelectorProps {
  selectedRoleId?: string
  onRoleChange: (roleId: string) => void
  disabled?: boolean
  placeholder?: string
  excludeRoles?: RoleName[]
  includeOnly?: RoleName[]
}

const roleIcons: Record<RoleName, React.ReactNode> = {
  owner: <Crown className="h-4 w-4" />,
  project_manager: <Users className="h-4 w-4" />,
  foreman: <Wrench className="h-4 w-4" />,
  viewer: <Eye className="h-4 w-4" />,
}

const roleColors: Record<RoleName, string> = {
  owner: 'text-purple-600',
  project_manager: 'text-blue-600',
  foreman: 'text-green-600',
  viewer: 'text-gray-600',
}

export function RoleSelector({
  selectedRoleId,
  onRoleChange,
  disabled = false,
  placeholder = 'Select a role...',
  excludeRoles = [],
  includeOnly
}: RoleSelectorProps) {
  const [open, setOpen] = useState(false)

  const { data: roles, isLoading } = useAssignableRoles()

  // Filter roles based on exclude/include criteria
  const filteredRoles = roles?.filter(role => {
    const roleName = role.name as RoleName

    if (includeOnly && includeOnly.length > 0) {
      return includeOnly.includes(roleName)
    }

    if (excludeRoles && excludeRoles.length > 0) {
      return !excludeRoles.includes(roleName)
    }

    return true
  }) || []

  const selectedRole = filteredRoles.find(role => role.id === selectedRoleId)

  if (isLoading) {
    return (
      <Button
        variant="outline"
        disabled
        className="w-full justify-between"
      >
        Loading roles...
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedRole ? (
            <div className="flex items-center gap-2">
              {roleIcons[selectedRole.name as RoleName] && (
                <span className={roleColors[selectedRole.name as RoleName]}>
                  {roleIcons[selectedRole.name as RoleName]}
                </span>
              )}
              <span>{selectedRole.display_name}</span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search roles..." />
          <CommandList>
            <CommandEmpty>No roles found.</CommandEmpty>
            <CommandGroup>
              {filteredRoles.map((role) => (
                <CommandItem
                  key={role.id}
                  value={role.display_name}
                  onSelect={() => {
                    onRoleChange(role.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedRole?.id === role.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    {roleIcons[role.name as RoleName] && (
                      <span className={roleColors[role.name as RoleName]}>
                        {roleIcons[role.name as RoleName]}
                      </span>
                    )}
                    <div className="flex flex-col">
                      <span className="font-medium">{role.display_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {role.description}
                      </span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface RoleBadgeProps {
  role: Role
  showDescription?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function RoleBadge({ role, showDescription = false, size = 'md' }: RoleBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border bg-muted/50',
        sizeClasses[size]
      )}
    >
      {roleIcons[role.name as RoleName] && (
        <span className={cn(roleColors[role.name as RoleName], iconSizes[size])}>
          {React.cloneElement(
            roleIcons[role.name as RoleName] as React.ReactElement,
            { className: iconSizes[size] }
          )}
        </span>
      )}
      <span className="font-medium">{role.display_name}</span>
      {showDescription && (
        <span className="text-muted-foreground">• {role.description}</span>
      )}
    </div>
  )
}

interface RoleHierarchyProps {
  currentRole?: Role
  showAll?: boolean
}

export function RoleHierarchy({ currentRole, showAll = false }: RoleHierarchyProps) {
  const { data: roles } = useAssignableRoles()

  if (!roles || roles.length === 0) {
    return null
  }

  const sortedRoles = [...roles]
    .filter(role => showAll || (currentRole && role.level <= currentRole.level))
    .sort((a, b) => b.level - a.level)

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Role Hierarchy</h4>
      <div className="space-y-1">
        {sortedRoles.map((role, index) => {
          const isCurrentRole = currentRole?.id === role.id
          const isLowerLevel = currentRole && role.level < currentRole.level

          return (
            <div
              key={role.id}
              className={cn(
                'flex items-center gap-2 rounded-md border p-2',
                isCurrentRole && 'border-primary bg-primary/5',
                isLowerLevel && 'opacity-60'
              )}
            >
              {roleIcons[role.name as RoleName] && (
                <span className={roleColors[role.name as RoleName]}>
                  {roleIcons[role.name as RoleName]}
                </span>
              )}
              <div className="flex flex-1 items-center justify-between">
                <span className="font-medium">{role.display_name}</span>
                {isCurrentRole && (
                  <span className="text-xs text-primary">Current</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface RolePermissionsProps {
  role: Role
  permissions?: Array<{
    id: string
    name: string
    resource: string
    action: string
    description?: string
  }>
}

export function RolePermissions({ role, permissions = [] }: RolePermissionsProps) {
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = []
    }
    acc[permission.resource].push(permission)
    return acc
  }, {} as Record<string, typeof permissions>)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {roleIcons[role.name as RoleName] && (
          <span className={roleColors[role.name as RoleName]}>
            {roleIcons[role.name as RoleName]}
          </span>
        )}
        <div>
          <h3 className="font-medium">{role.display_name}</h3>
          <p className="text-sm text-muted-foreground">{role.description}</p>
        </div>
      </div>

      {Object.keys(groupedPermissions).length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Permissions</h4>
          {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
            <div key={resource} className="space-y-2">
              <h5 className="text-sm font-medium capitalize">{resource}</h5>
              <div className="grid gap-1">
                {resourcePermissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="flex items-center justify-between rounded border bg-muted/30 p-2 text-xs"
                  >
                    <span className="font-mono capitalize">
                      {permission.action}
                    </span>
                    {permission.description && (
                      <span className="text-muted-foreground">
                        {permission.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No specific permissions assigned</p>
      )}
    </div>
  )
}