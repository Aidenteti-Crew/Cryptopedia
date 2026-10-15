'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

import chainCatalog from '@/public/cryptopedia/chains.json'
import type { SelectedChain } from './editorial-brand'

interface EditorialChainContextValue {
  activeChain: SelectedChain
  setActiveChain: (chain: SelectedChain) => void
}

const EditorialChainContext = createContext<EditorialChainContextValue | null>(null)

export function EditorialChainProvider({ children }: { children: ReactNode }) {
  const [activeChain, setActiveChain] = useState<SelectedChain>(
    chainCatalog.items.find((chain) => chain.id === chainCatalog.currentChainId) ?? chainCatalog.items[0]
  )

  return (
    <EditorialChainContext.Provider value={{ activeChain, setActiveChain }}>
      {children}
    </EditorialChainContext.Provider>
  )
}

export function useEditorialChain() {
  const context = useContext(EditorialChainContext)
  if (!context) throw new Error('Editorial pages must be inside EditorialChainProvider')
  return context
}
