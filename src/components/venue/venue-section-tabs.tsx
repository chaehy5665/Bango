'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface VenueSectionTabsProps {
  sections: Array<{ id: string; label: string }>
}

export function VenueSectionTabs({ sections }: VenueSectionTabsProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? '')

  if (sections.length === 0) {
    return null
  }

  const handleTabClick = (sectionId: string) => {
    setActiveSection(sectionId)
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="sticky top-[88px] z-[5] -mx-4 border-b bg-gray-50/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80">
      <div role="tablist" aria-label="상세 정보 섹션" className="flex gap-2 overflow-x-auto">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={activeSection === section.id}
            onClick={() => handleTabClick(section.id)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              activeSection === section.id
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
    </div>
  )
}
