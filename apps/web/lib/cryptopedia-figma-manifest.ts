export type FigmaImplementationStatus = "complete" | "partial" | "missing"

export interface FigmaScreenManifestEntry {
  family: string
  nodes: {
    desktop: string
    tablet: string
    mobile: string
  }
  status: FigmaImplementationStatus
}

export const FIGMA_SCREEN_MANIFEST: FigmaScreenManifestEntry[] = [
  { family: "fundamentals", nodes: { desktop: "153:494", tablet: "153:1451", mobile: "153:1950" }, status: "complete" },
  { family: "builders", nodes: { desktop: "153:2446", tablet: "153:3403", mobile: "153:3902" }, status: "complete" },
  { family: "academy", nodes: { desktop: "154:638", tablet: "154:1595", mobile: "154:2094" }, status: "complete" },
  { family: "ecosystem", nodes: { desktop: "154:2590", tablet: "154:3547", mobile: "154:4046" }, status: "complete" },
  { family: "reader", nodes: { desktop: "154:7430", tablet: "154:7907", mobile: "154:8384" }, status: "complete" },
  { family: "architecture", nodes: { desktop: "154:8858", tablet: "154:9335", mobile: "154:9812" }, status: "complete" },
  { family: "validator", nodes: { desktop: "154:10286", tablet: "154:10763", mobile: "154:11240" }, status: "complete" },
  { family: "glossary", nodes: { desktop: "154:11750", tablet: "154:12227", mobile: "154:12704" }, status: "complete" },
  { family: "docs", nodes: { desktop: "154:13178", tablet: "154:13655", mobile: "154:14132" }, status: "complete" },
  { family: "code", nodes: { desktop: "154:14606", tablet: "154:15083", mobile: "154:15560" }, status: "complete" },
  { family: "protocol", nodes: { desktop: "155:866", tablet: "155:1343", mobile: "155:1820" }, status: "complete" },
  { family: "course", nodes: { desktop: "155:2294", tablet: "155:2771", mobile: "155:3248" }, status: "complete" },
  { family: "lesson", nodes: { desktop: "155:3722", tablet: "155:4199", mobile: "155:4676" }, status: "complete" },
  { family: "graph", nodes: { desktop: "155:5966", tablet: "155:6443", mobile: "155:6920" }, status: "complete" },
  { family: "chains", nodes: { desktop: "156:3794", tablet: "156:4271", mobile: "156:4748" }, status: "complete" },
  { family: "article", nodes: { desktop: "164:2435", tablet: "164:2950", mobile: "164:3465" }, status: "complete" },
  { family: "projects", nodes: { desktop: "190:1172", tablet: "190:1696", mobile: "190:2215" }, status: "complete" },
  { family: "macro", nodes: { desktop: "190:2731", tablet: "190:3250", mobile: "190:3769" }, status: "complete" },
  { family: "events", nodes: { desktop: "190:4285", tablet: "190:4810", mobile: "190:5335" }, status: "complete" },
  { family: "updates", nodes: { desktop: "190:5857", tablet: "190:6376", mobile: "190:6895" }, status: "complete" },
  { family: "macro-detail", nodes: { desktop: "193:2999", tablet: "193:3504", mobile: "193:4009" }, status: "complete" },
  { family: "event-archive", nodes: { desktop: "205:1799", tablet: "205:2390", mobile: "205:2981" }, status: "complete" },
  { family: "book-avalanche", nodes: { desktop: "210:1940", tablet: "210:2518", mobile: "210:3091" }, status: "complete" },
  { family: "book-beam", nodes: { desktop: "210:3663", tablet: "210:4236", mobile: "210:4809" }, status: "complete" },
  { family: "book-dexalot", nodes: { desktop: "210:5381", tablet: "210:5954", mobile: "210:6527" }, status: "complete" },
  { family: "book-allblue", nodes: { desktop: "210:7099", tablet: "210:7672", mobile: "210:8245" }, status: "complete" },
  { family: "book-pengolin", nodes: { desktop: "210:8817", tablet: "210:9390", mobile: "210:9963" }, status: "complete" },
]
