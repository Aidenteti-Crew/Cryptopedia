import { createCryptopediaRepository } from './cryptopedia-data'
import { createSnapshotFetch } from './cryptopedia-live-snapshot'

/* API 주소가 없는 배포(Vercel 데모)는 LIVE 화면을 굳힌 응답(public/cryptopedia/live)으로 그린다 */
export const cryptopediaRepository = process.env.NEXT_PUBLIC_API_URL
  ? createCryptopediaRepository()
  : createCryptopediaRepository(createSnapshotFetch(), '')
