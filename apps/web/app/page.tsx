import type { Metadata } from "next"

import { EditorialApp } from "@/components/cherry/editorial/editorial-app"

export const metadata: Metadata = {
  title: "Cryptopedia — The Blockchain Encyclopedia",
  description: "Avalanche knowledge, connected.",
}

export default function Page() {
  return <EditorialApp />
}
