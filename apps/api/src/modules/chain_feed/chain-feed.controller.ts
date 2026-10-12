import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChainFeedService } from './chain-feed.service';
import type {
  ContentFeedResponse,
  EcosystemHubResponse,
  EventFeedResponse,
  ProjectsResponse,
} from './chain-feed.types';
import {
  InvalidEventQueryError,
  parseChain,
  parseEventQuery,
} from './event-query';
import { parseContentFeedQuery, parseProjectsQuery } from './feed-query';

// Validation failures become HTTP 400 with the {code, message} body the event contract asks for;
// anything else (database errors) stays a plain 500 so no query text or credentials leak.
function badRequest(code: string, error: unknown): never {
  if (error instanceof InvalidEventQueryError) {
    throw new BadRequestException({ code, message: error.message });
  }
  throw error;
}

@Controller('events')
@ApiTags('Chain events')
export class EventsController {
  constructor(private readonly feed: ChainFeedService) {}

  @Get()
  @ApiOperation({
    summary:
      '행사·이벤트 목록 (chain, status, from, to, limit<=100, cursor). 상태는 응답 시점에 계산',
  })
  async list(
    @Query() query: Record<string, unknown>,
  ): Promise<EventFeedResponse> {
    let parsed;
    try {
      parsed = parseEventQuery(query);
    } catch (error) {
      return badRequest('INVALID_EVENT_QUERY', error);
    }
    return this.feed.listEvents(parsed);
  }
}

@Controller('ecosystem')
@ApiTags('Chain ecosystem')
export class EcosystemController {
  constructor(private readonly feed: ChainFeedService) {}

  @Get()
  @ApiOperation({
    summary:
      '생태계·매크로 한 페이지용: 프로젝트 요약 + 매크로 + 예정 행사 + 기술 업데이트 + 기타 정보',
  })
  async hub(
    @Query() query: Record<string, unknown>,
  ): Promise<EcosystemHubResponse> {
    try {
      return await this.feed.getHub(parseChain(query));
    } catch (error) {
      return badRequest('INVALID_FEED_QUERY', error);
    }
  }

  @Get('projects')
  @ApiOperation({ summary: '생태계 프로젝트 디렉터리 (category, limit<=500)' })
  async projects(
    @Query() query: Record<string, unknown>,
  ): Promise<ProjectsResponse> {
    try {
      return await this.feed.listProjects(parseProjectsQuery(query));
    } catch (error) {
      return badRequest('INVALID_FEED_QUERY', error);
    }
  }

  @Get('macro')
  @ApiOperation({
    summary: '매크로 소식 (limit, minImportance, sort=latest|importance)',
  })
  async macro(
    @Query() query: Record<string, unknown>,
  ): Promise<ContentFeedResponse> {
    try {
      return await this.feed.listMacro(parseContentFeedQuery(query));
    } catch (error) {
      return badRequest('INVALID_FEED_QUERY', error);
    }
  }

  @Get('general')
  @ApiOperation({
    summary:
      '기타 정보: 네 분류에 안 맞는 교육·해설 글 (limit, minImportance, sort)',
  })
  async general(
    @Query() query: Record<string, unknown>,
  ): Promise<ContentFeedResponse> {
    try {
      return await this.feed.listGeneral(parseContentFeedQuery(query));
    } catch (error) {
      return badRequest('INVALID_FEED_QUERY', error);
    }
  }

  @Get('updates')
  @ApiOperation({
    summary: '기술 업데이트 (limit, minImportance, sort=latest|importance)',
  })
  async updates(
    @Query() query: Record<string, unknown>,
  ): Promise<ContentFeedResponse> {
    try {
      return await this.feed.listUpdates(parseContentFeedQuery(query));
    } catch (error) {
      return badRequest('INVALID_FEED_QUERY', error);
    }
  }
}
