import { EditorialChainProvider } from '@/components/cherry/editorial/editorial-chain-provider'

export default function CryptopediaLayout({ children }: { children: React.ReactNode }) {
  return <EditorialChainProvider>{children}</EditorialChainProvider>
}
