'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { requestStoreReviewAfterSuccess } from '@/lib/review/request-store-review'

export default function RequestReviewOnSave() {
  const pathname = usePathname()

  useEffect(() => {
    window.history.replaceState(null, '', pathname)
    void requestStoreReviewAfterSuccess()
  }, [pathname])

  return null
}
