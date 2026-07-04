import fs, { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import fetch, { AbortError } from 'node-fetch'
import {
  NOTION_API_SECRET,
  DATABASE_ID,
  NUMBER_OF_POSTS_PER_PAGE,
  REQUEST_TIMEOUT_MS,
} from '../../server-constants'
import type * as responses from './responses'
import type * as requestParams from './request-params'
import type {
  Post,
  Block,
  Paragraph,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  BulletedListItem,
  NumberedListItem,
  ToDo,
  Image,
  Code,
  Quote,
  Equation,
  Callout,
  Embed,
  Video,
  File,
  Bookmark,
  LinkPreview,
  SyncedBlock,
  SyncedFrom,
  Table,
  TableRow,
  TableCell,
  Toggle,
  ColumnList,
  Column,
  TableOfContents,
  RichText,
  Text,
  Annotation,
  SelectProperty,
  Emoji,
  FileObject,
  LinkToPage,
  ChildDatabase,
  DatabaseChart,
  DatabaseChartItem,
  DatabaseChartType,
  Mention,
  Reference,
  Tab,
  Unsupported,
} from '../interfaces'
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { Client } from '@notionhq/client'

const client = new Client({
  auth: NOTION_API_SECRET,
})

let cache: Post[] | null = null

const isNotionConfigured = (): boolean =>
  NOTION_API_SECRET.trim().length > 0 && DATABASE_ID.trim().length > 0

export async function getAllPosts(): Promise<Post[]> {
  if (!isNotionConfigured()) {
    cache = []
    return cache
  }

  if (cache !== null) {
    return Promise.resolve(cache)
  }

  const params: requestParams.QueryDatabase = {
    database_id: DATABASE_ID,
    filter: {
      and: [
        {
          property: 'Published',
          checkbox: {
            equals: true,
          },
        },
        {
          property: 'Date',
          date: {
            on_or_before: new Date().toISOString(),
          },
        },
      ],
    },
    sorts: [
      {
        property: 'Date',
        direction: 'descending',
      },
    ],
    page_size: 100,
  }

  let results: responses.PageObject[] = []
  while (true) {
    const res = (await client.databases.query(
      params as any // eslint-disable-line @typescript-eslint/no-explicit-any
    )) as responses.QueryDatabaseResponse

    results = results.concat(res.results)

    if (!res.has_more) {
      break
    }

    params['start_cursor'] = res.next_cursor as string
  }

  cache = results
    .filter((pageObject) => _validPageObject(pageObject))
    .map((pageObject) => _buildPost(pageObject))
  return cache
}

export async function getPosts(pageSize = 10): Promise<Post[]> {
  const allPosts = await getAllPosts()
  return allPosts.slice(0, pageSize)
}

export async function getRankedPosts(pageSize = 10): Promise<Post[]> {
  const allPosts = await getAllPosts()
  return allPosts
    .filter((post) => !!post.Rank)
    .sort((a, b) => {
      if (a.Rank > b.Rank) {
        return -1
      } else if (a.Rank === b.Rank) {
        return 0
      }
      return 1
    })
    .slice(0, pageSize)
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const allPosts = await getAllPosts()
  return allPosts.find((post) => post.Slug === slug) || null
}

export async function getPostByPageId(pageId: string): Promise<Post | null> {
  const allPosts = await getAllPosts()
  return allPosts.find((post) => post.PageId === pageId) || null
}

export async function getPostsByTag(
  tagName: string,
  pageSize = 10
): Promise<Post[]> {
  if (!tagName) return []

  const allPosts = await getAllPosts()
  return allPosts
    .filter((post) => post.Tags.find((tag) => tag.name === tagName))
    .slice(0, pageSize)
}

// page starts from 1 not 0
export async function getPostsByPage(page: number): Promise<Post[]> {
  if (page < 1) {
    return []
  }

  const allPosts = await getAllPosts()

  const startIndex = (page - 1) * NUMBER_OF_POSTS_PER_PAGE
  const endIndex = startIndex + NUMBER_OF_POSTS_PER_PAGE

  return allPosts.slice(startIndex, endIndex)
}

// page starts from 1 not 0
export async function getPostsByTagAndPage(
  tagName: string,
  page: number
): Promise<Post[]> {
  if (page < 1) {
    return []
  }

  const allPosts = await getAllPosts()
  const posts = allPosts.filter((post) =>
    post.Tags.find((tag) => tag.name === tagName)
  )

  const startIndex = (page - 1) * NUMBER_OF_POSTS_PER_PAGE
  const endIndex = startIndex + NUMBER_OF_POSTS_PER_PAGE

  return posts.slice(startIndex, endIndex)
}

export async function getNumberOfPages(): Promise<number> {
  const allPosts = await getAllPosts()
  return (
    Math.floor(allPosts.length / NUMBER_OF_POSTS_PER_PAGE) +
    (allPosts.length % NUMBER_OF_POSTS_PER_PAGE > 0 ? 1 : 0)
  )
}

export async function getNumberOfPagesByTag(tagName: string): Promise<number> {
  const allPosts = await getAllPosts()
  const posts = allPosts.filter((post) =>
    post.Tags.find((tag) => tag.name === tagName)
  )
  return (
    Math.floor(posts.length / NUMBER_OF_POSTS_PER_PAGE) +
    (posts.length % NUMBER_OF_POSTS_PER_PAGE > 0 ? 1 : 0)
  )
}

export async function getAllBlocksByBlockId(blockId: string): Promise<Block[]> {
  let results: responses.BlockObject[] = []

  if (fs.existsSync(`tmp/${blockId}.json`)) {
    results = JSON.parse(fs.readFileSync(`tmp/${blockId}.json`, 'utf-8'))
  } else {
    const params: requestParams.RetrieveBlockChildren = {
      block_id: blockId,
    }

    while (true) {
      const res = (await client.blocks.children.list(
        params as any // eslint-disable-line @typescript-eslint/no-explicit-any
      )) as responses.RetrieveBlockChildrenResponse

      results = results.concat(res.results)

      if (!res.has_more) {
        break
      }

      params['start_cursor'] = res.next_cursor as string
    }
  }

  const allBlocks = results.map((blockObject) => _buildBlock(blockObject))

  for (let i = 0; i < allBlocks.length; i++) {
    const block = allBlocks[i]

    if (block.Type === 'table' && block.Table) {
      block.Table.Rows = await _getTableRows(block.Id)
    } else if (block.Type === 'column_list' && block.ColumnList) {
      block.ColumnList.Columns = await _getColumns(block.Id)
    } else if (
      block.Type === 'bulleted_list_item' &&
      block.BulletedListItem &&
      block.HasChildren
    ) {
      block.BulletedListItem.Children = await getAllBlocksByBlockId(block.Id)
    } else if (
      block.Type === 'numbered_list_item' &&
      block.NumberedListItem &&
      block.HasChildren
    ) {
      block.NumberedListItem.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'to_do' && block.ToDo && block.HasChildren) {
      block.ToDo.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'synced_block' && block.SyncedBlock) {
      block.SyncedBlock.Children = await _getSyncedBlockChildren(block)
    } else if (block.Type === 'toggle' && block.Toggle) {
      block.Toggle.Children = await getAllBlocksByBlockId(block.Id)
    } else if (
      block.Type === 'paragraph' &&
      block.Paragraph &&
      block.HasChildren
    ) {
      block.Paragraph.Children = await getAllBlocksByBlockId(block.Id)
    } else if (
      block.Type === 'heading_1' &&
      block.Heading1 &&
      block.HasChildren
    ) {
      block.Heading1.Children = await getAllBlocksByBlockId(block.Id)
    } else if (
      block.Type === 'heading_2' &&
      block.Heading2 &&
      block.HasChildren
    ) {
      block.Heading2.Children = await getAllBlocksByBlockId(block.Id)
    } else if (
      block.Type === 'heading_3' &&
      block.Heading3 &&
      block.HasChildren
    ) {
      block.Heading3.Children = await getAllBlocksByBlockId(block.Id)
    } else if (
      block.Type === 'heading_4' &&
      block.Heading4 &&
      block.HasChildren
    ) {
      block.Heading4.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'quote' && block.Quote && block.HasChildren) {
      block.Quote.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'callout' && block.Callout && block.HasChildren) {
      block.Callout.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'tab' && block.Tab && block.HasChildren) {
      block.Tab.Children = await getAllBlocksByBlockId(block.Id)
    } else if (block.Type === 'child_database' && block.ChildDatabase) {
      block.ChildDatabase.Chart = await _getDatabaseChart(
        block.Id,
        block.ChildDatabase.Title
      )
    }
  }

  return allBlocks
}

export async function getBlock(blockId: string): Promise<Block> {
  const params: requestParams.RetrieveBlock = {
    block_id: blockId,
  }
  const res = (await client.blocks.retrieve(
    params as any // eslint-disable-line @typescript-eslint/no-explicit-any
  )) as responses.RetrieveBlockResponse

  return _buildBlock(res)
}

export async function getAllTags(): Promise<SelectProperty[]> {
  const allPosts = await getAllPosts()

  const tagNames: string[] = []
  return allPosts
    .flatMap((post) => post.Tags)
    .reduce((acc, tag) => {
      if (!tagNames.includes(tag.name)) {
        acc.push(tag)
        tagNames.push(tag.name)
      }
      return acc
    }, [] as SelectProperty[])
    .sort((a: SelectProperty, b: SelectProperty) =>
      a.name.localeCompare(b.name)
    )
}

export async function downloadFile(url: URL) {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  let res!: Response
  try {
    res = (await fetch(url.toString(), {
      signal: controller.signal,
    })) as Response
  } catch (err) {
    if (err instanceof AbortError) {
      console.log('File fetch request was aborted')
      return Promise.resolve()
    }
  } finally {
    clearTimeout(timeout)
  }

  if (!res || !res.body) {
    return Promise.resolve()
  }

  const dir = './public/notion/' + url.pathname.split('/').slice(-2)[0]
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  const filename = decodeURIComponent(url.pathname.split('/').slice(-1)[0])
  const filepath = `${dir}/${filename}`

  const streamPipeline = promisify(pipeline)
  return streamPipeline(res.body, createWriteStream(filepath))
}

function _buildBlock(blockObject: responses.BlockObject): Block {
  const block: Block = {
    Id: blockObject.id,
    Type: blockObject.type,
    HasChildren: blockObject.has_children,
  }

  switch (blockObject.type) {
    case 'paragraph':
      if (blockObject.paragraph) {
        const paragraph: Paragraph = {
          RichTexts: blockObject.paragraph.rich_text.map(_buildRichText),
          Color: blockObject.paragraph.color,
        }
        block.Paragraph = paragraph
      }
      break
    case 'heading_1':
      if (blockObject.heading_1) {
        const heading1: Heading1 = {
          RichTexts: blockObject.heading_1.rich_text.map(_buildRichText),
          Color: blockObject.heading_1.color,
          IsToggleable: blockObject.heading_1.is_toggleable,
        }
        block.Heading1 = heading1
      }
      break
    case 'heading_2':
      if (blockObject.heading_2) {
        const heading2: Heading2 = {
          RichTexts: blockObject.heading_2.rich_text.map(_buildRichText),
          Color: blockObject.heading_2.color,
          IsToggleable: blockObject.heading_2.is_toggleable,
        }
        block.Heading2 = heading2
      }
      break
    case 'heading_3':
      if (blockObject.heading_3) {
        const heading3: Heading3 = {
          RichTexts: blockObject.heading_3.rich_text.map(_buildRichText),
          Color: blockObject.heading_3.color,
          IsToggleable: blockObject.heading_3.is_toggleable,
        }
        block.Heading3 = heading3
      }
      break
    case 'heading_4':
      if (blockObject.heading_4) {
        const heading4: Heading4 = {
          RichTexts: blockObject.heading_4.rich_text.map(_buildRichText),
          Color: blockObject.heading_4.color,
          IsToggleable: blockObject.heading_4.is_toggleable,
        }
        block.Heading4 = heading4
      }
      break
    case 'bulleted_list_item':
      if (blockObject.bulleted_list_item) {
        const bulletedListItem: BulletedListItem = {
          RichTexts:
            blockObject.bulleted_list_item.rich_text.map(_buildRichText),
          Color: blockObject.bulleted_list_item.color,
        }
        block.BulletedListItem = bulletedListItem
      }
      break
    case 'numbered_list_item':
      if (blockObject.numbered_list_item) {
        const numberedListItem: NumberedListItem = {
          RichTexts:
            blockObject.numbered_list_item.rich_text.map(_buildRichText),
          Color: blockObject.numbered_list_item.color,
        }
        block.NumberedListItem = numberedListItem
      }
      break
    case 'to_do':
      if (blockObject.to_do) {
        const toDo: ToDo = {
          RichTexts: blockObject.to_do.rich_text.map(_buildRichText),
          Checked: blockObject.to_do.checked,
          Color: blockObject.to_do.color,
        }
        block.ToDo = toDo
      }
      break
    case 'video':
      if (blockObject.video) {
        const video: Video = {
          Caption: blockObject.video.caption?.map(_buildRichText) || [],
          Type: blockObject.video.type,
        }
        if (
          blockObject.video.type === 'external' &&
          blockObject.video.external
        ) {
          video.External = { Url: blockObject.video.external.url }
        }
        block.Video = video
      }
      break
    case 'image':
      if (blockObject.image) {
        const image: Image = {
          Caption: blockObject.image.caption?.map(_buildRichText) || [],
          Type: blockObject.image.type,
        }
        if (
          blockObject.image.type === 'external' &&
          blockObject.image.external
        ) {
          image.External = { Url: blockObject.image.external.url }
        } else if (
          blockObject.image.type === 'file' &&
          blockObject.image.file
        ) {
          image.File = {
            Url: blockObject.image.file.url,
            ExpiryTime: blockObject.image.file.expiry_time,
          }
        }
        block.Image = image
      }
      break
    case 'file':
      if (blockObject.file) {
        const file: File = {
          Caption: blockObject.file.caption?.map(_buildRichText) || [],
          Type: blockObject.file.type,
        }
        if (blockObject.file.type === 'external' && blockObject.file.external) {
          file.External = { Url: blockObject.file.external.url }
        } else if (blockObject.file.type === 'file' && blockObject.file.file) {
          file.File = {
            Url: blockObject.file.file.url,
            ExpiryTime: blockObject.file.file.expiry_time,
          }
        }
        block.File = file
      }
      break
    case 'pdf':
      if (blockObject.pdf) {
        const pdf: File = {
          Caption: blockObject.pdf.caption?.map(_buildRichText) || [],
          Type: blockObject.pdf.type,
        }
        if (blockObject.pdf.type === 'external' && blockObject.pdf.external) {
          pdf.External = { Url: blockObject.pdf.external.url }
        } else if (blockObject.pdf.type === 'file' && blockObject.pdf.file) {
          pdf.File = {
            Url: blockObject.pdf.file.url,
            ExpiryTime: blockObject.pdf.file.expiry_time,
          }
        }
        block.Pdf = pdf
      }
      break
    case 'code':
      if (blockObject.code) {
        const code: Code = {
          Caption: blockObject.code.caption?.map(_buildRichText) || [],
          RichTexts: blockObject.code.rich_text.map(_buildRichText),
          Language: blockObject.code.language,
        }
        block.Code = code
      }
      break
    case 'quote':
      if (blockObject.quote) {
        const quote: Quote = {
          RichTexts: blockObject.quote.rich_text.map(_buildRichText),
          Color: blockObject.quote.color,
        }
        block.Quote = quote
      }
      break
    case 'equation':
      if (blockObject.equation) {
        const equation: Equation = {
          Expression: blockObject.equation.expression,
        }
        block.Equation = equation
      }
      break
    case 'callout':
      if (blockObject.callout) {
        const icon = blockObject.callout.icon
        const callout: Callout = {
          RichTexts: blockObject.callout.rich_text.map(_buildRichText),
          Icon: {
            Type: icon?.type || 'emoji',
            Emoji: icon?.emoji || '',
            Url: icon?.external?.url || icon?.file?.url || '',
          },
          Color: blockObject.callout.color,
        }
        block.Callout = callout
      }
      break
    case 'synced_block':
      if (blockObject.synced_block) {
        let syncedFrom: SyncedFrom | null = null
        if (
          blockObject.synced_block.synced_from &&
          blockObject.synced_block.synced_from.block_id
        ) {
          syncedFrom = {
            BlockId: blockObject.synced_block.synced_from.block_id,
          }
        }

        const syncedBlock: SyncedBlock = {
          SyncedFrom: syncedFrom,
        }
        block.SyncedBlock = syncedBlock
      }
      break
    case 'toggle':
      if (blockObject.toggle) {
        const toggle: Toggle = {
          RichTexts: blockObject.toggle.rich_text.map(_buildRichText),
          Color: blockObject.toggle.color,
          Children: [],
        }
        block.Toggle = toggle
      }
      break
    case 'embed':
      if (blockObject.embed) {
        const embed: Embed = {
          Url: blockObject.embed.url,
        }
        block.Embed = embed
      }
      break
    case 'bookmark':
      if (blockObject.bookmark) {
        const bookmark: Bookmark = {
          Url: blockObject.bookmark.url,
        }
        block.Bookmark = bookmark
      }
      break
    case 'link_preview':
      if (blockObject.link_preview) {
        const linkPreview: LinkPreview = {
          Url: blockObject.link_preview.url,
        }
        block.LinkPreview = linkPreview
      }
      break
    case 'table':
      if (blockObject.table) {
        const table: Table = {
          TableWidth: blockObject.table.table_width,
          HasColumnHeader: blockObject.table.has_column_header,
          HasRowHeader: blockObject.table.has_row_header,
          Rows: [],
        }
        block.Table = table
      }
      break
    case 'column_list':
      const columnList: ColumnList = {
        Columns: [],
      }
      block.ColumnList = columnList
      break
    case 'child_database':
      if (blockObject.child_database) {
        const childDatabase: ChildDatabase = {
          Title: blockObject.child_database.title,
        }
        block.ChildDatabase = childDatabase
      }
      break
    case 'table_of_contents':
      if (blockObject.table_of_contents) {
        const tableOfContents: TableOfContents = {
          Color: blockObject.table_of_contents.color,
        }
        block.TableOfContents = tableOfContents
      }
      break
    case 'link_to_page':
      if (blockObject.link_to_page && blockObject.link_to_page.page_id) {
        const linkToPage: LinkToPage = {
          Type: blockObject.link_to_page.type,
          PageId: blockObject.link_to_page.page_id,
        }
        block.LinkToPage = linkToPage
      }
      break
    case 'tab': {
      const tab: Tab = {
        Children: [],
      }
      block.Tab = tab
      break
    }
    case 'unsupported': {
      const unsupported: Unsupported = {
        BlockType: blockObject.unsupported?.block_type || 'unknown',
      }
      block.Unsupported = unsupported
      break
    }
  }

  return block
}

const chartTypeByDatabaseId: Record<string, DatabaseChartType> = {
  '8ff73b83-3e8e-4000-a0df-e2a6dea7c05f': 'horizontal_bar',
  '7806db38-ebfd-48f2-9851-3f2e2053a353': 'line',
  'a749ebb7-dff1-453b-867a-46db48dbea1e': 'number',
  '853bdaba-23a8-432e-9e53-a4132f4746ed': 'donut',
  '3c9fca6f-a627-4d97-947b-87004cce550d': 'vertical_bar',
}

const chartTypeByTitle = (title: string, data: DatabaseChartItem[]): DatabaseChartType => {
  if (data.length === 1 || /PV|数値|合計|今月|総計|number/i.test(title)) {
    return 'number'
  }
  if (/推移|線|売上|時系列|trend|line/i.test(title)) {
    return 'line'
  }
  if (/構成|比|割合|内訳|donut|doughnut|pie/i.test(title)) {
    return 'donut'
  }
  if (/横棒|horizontal/i.test(title)) {
    return 'horizontal_bar'
  }
  return 'vertical_bar'
}

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null

const getString = (record: UnknownRecord, key: string): string | undefined =>
  typeof record[key] === 'string' ? record[key] : undefined

const getBoolean = (record: UnknownRecord, key: string): boolean | undefined =>
  typeof record[key] === 'boolean' ? record[key] : undefined

const getNumber = (record: UnknownRecord, key: string): number | undefined =>
  typeof record[key] === 'number' ? record[key] : undefined

const getRecord = (record: UnknownRecord, key: string): UnknownRecord | undefined =>
  isRecord(record[key]) ? record[key] : undefined

const getChartConfigFromView = (view: unknown): UnknownRecord | undefined => {
  if (!isRecord(view)) return undefined

  const directChartConfig = getRecord(view, 'chartConfig')
  if (directChartConfig) return directChartConfig

  const directChartConfigSnake = getRecord(view, 'chart_config')
  if (directChartConfigSnake) return directChartConfigSnake

  const configuration = getRecord(view, 'configuration')
  if (configuration) return configuration

  const directChart = getRecord(view, 'chart')
  if (directChart) return directChart

  const nestedView = getRecord(view, 'view')
  const nestedChartConfig = nestedView
    ? getRecord(nestedView, 'chartConfig')
    : undefined
  if (nestedChartConfig) return nestedChartConfig

  const nestedChartConfigSnake = nestedView
    ? getRecord(nestedView, 'chart_config')
    : undefined
  if (nestedChartConfigSnake) return nestedChartConfigSnake

  const nestedConfiguration = nestedView
    ? getRecord(nestedView, 'configuration')
    : undefined
  if (nestedConfiguration) return nestedConfiguration

  const nestedChart = nestedView ? getRecord(nestedView, 'chart') : undefined
  return nestedChart
}

const getChartConfig = (database: unknown): UnknownRecord | undefined => {
  if (!isRecord(database)) return undefined

  const views = Array.isArray(database.views) ? database.views : []
  const chartView = views.filter(isRecord).find((view) => {
    const chartConfig = getChartConfigFromView(view)
    return getString(view, 'type') === 'chart' && Boolean(chartConfig)
  })

  return chartView ? getChartConfigFromView(chartView) : undefined
}

const fetchJsonFromNotion = async (url: URL): Promise<unknown> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${NOTION_API_SECRET}`,
        'Notion-Version': '2025-09-03',
      },
      signal: controller.signal,
    })

    if (!response.ok) return undefined
    return response.json() as Promise<unknown>
  } catch (error) {
    if (!(error instanceof AbortError)) {
      console.warn(`Failed to fetch from Notion API: ${url.pathname}`, error)
    }
    return undefined
  } finally {
    clearTimeout(timeout)
  }
}

const fetchChartConfigFromViewsApi = async (
  databaseId: string
): Promise<UnknownRecord | undefined> => {
  if (!NOTION_API_SECRET) return undefined

  const listUrl = new URL('https://api.notion.com/v1/views')
  listUrl.searchParams.set('database_id', databaseId)
  listUrl.searchParams.set('page_size', '100')

  const listBody = await fetchJsonFromNotion(listUrl)
  if (!isRecord(listBody) || !Array.isArray(listBody.results)) {
    return undefined
  }

  for (const view of listBody.results.filter(isRecord)) {
    const inlineConfig = getChartConfigFromView(view)
    if (inlineConfig && getString(view, 'type') === 'chart') {
      return inlineConfig
    }

    const viewId = getString(view, 'id')
    if (!viewId) continue

    const retrieveUrl = new URL(
      `https://api.notion.com/v1/views/${encodeURIComponent(viewId)}`
    )
    const viewBody = await fetchJsonFromNotion(retrieveUrl)
    if (!isRecord(viewBody)) continue
    if (getString(viewBody, 'type') !== 'chart') continue

    const chartConfig = getChartConfigFromView(viewBody)
    if (chartConfig) return chartConfig
  }

  return undefined
}

const chartTypeFromConfig = (
  config: UnknownRecord | undefined
): DatabaseChartType | undefined => {
  if (!config) return undefined

  const dataConfig = getRecord(config, 'dataConfig')
  const valueSeriesFormat = dataConfig
    ? getRecord(dataConfig, 'valueSeriesFormat')
    : undefined
  const displayType = valueSeriesFormat
    ? getString(valueSeriesFormat, 'displayType')
    : undefined
  const type =
    displayType ||
    getString(config, 'chart_type') ||
    getString(config, 'chartType') ||
    getString(config, 'type')

  switch (type) {
    case 'column':
    case 'vertical_bar':
      return 'vertical_bar'
    case 'bar':
    case 'horizontal_bar':
      return 'horizontal_bar'
    case 'line':
      return 'line'
    case 'donut':
    case 'pie':
      return 'donut'
    case 'number':
      return 'number'
    default:
      return undefined
  }
}

const chartPropertiesFromConfig = (
  config: UnknownRecord | undefined
): {
  labelProperty?: string
  valueProperty?: string
  colorTheme?: string
  showDataLabels?: boolean
  colorByValue?: boolean
  smoothLine?: boolean
  caption?: string
  showCaption?: boolean
  numberColor?: string
  donutDataLabels?: string
  height?: string
  gridLines?: string
  axisLabels?: string
  legendPosition?: string
  showLegend?: boolean
  sort?: string
  aggregator?: string
  valueLabel?: string
  valueSuffix?: string
  showValue?: boolean
  showValueLabel?: boolean
  hideLineFillArea?: boolean
  hideTitle?: boolean
  yAxisMin?: number
  yAxisMax?: number
} => {
  if (!config) return {}

  const chartFormat = getRecord(config, 'chartFormat')
  const dataConfig = getRecord(config, 'dataConfig')
  const aggregationConfig = dataConfig
    ? getRecord(dataConfig, 'aggregationConfig')
    : undefined
  const aggregation = aggregationConfig
    ? getRecord(aggregationConfig, 'aggregation')
    : undefined
  const xAxis = getRecord(config, 'x_axis') || getRecord(config, 'xAxis')
  const yAxis = getRecord(config, 'y_axis') || getRecord(config, 'yAxis')
  const value = getRecord(config, 'value')
  const number = getRecord(config, 'number')
  const format = chartFormat || config
  const legend = getRecord(format, 'legend') || getRecord(config, 'legend')
  const dataLabels =
    getRecord(format, 'dataLabels') ||
    getRecord(format, 'data_labels') ||
    getRecord(config, 'dataLabels') ||
    getRecord(config, 'data_labels')
  const centerValue =
    getRecord(format, 'centerValue') ||
    getRecord(format, 'center_value') ||
    getRecord(config, 'centerValue') ||
    getRecord(config, 'center_value')

  return {
    labelProperty:
      (dataConfig ? getString(dataConfig, 'nameProperty') : undefined) ||
      getString(config, 'name_property') ||
      getString(config, 'nameProperty') ||
      getString(config, 'x_axis_property_id') ||
      getString(config, 'xAxisPropertyId') ||
      (xAxis ? getString(xAxis, 'property_id') || getString(xAxis, 'property') : undefined),
    valueProperty:
      (dataConfig ? getString(dataConfig, 'valueProperty') : undefined) ||
      (aggregation ? getString(aggregation, 'property') : undefined) ||
      getString(config, 'value_property') ||
      getString(config, 'valueProperty') ||
      getString(config, 'y_axis_property_id') ||
      getString(config, 'yAxisPropertyId') ||
      (yAxis ? getString(yAxis, 'property_id') || getString(yAxis, 'property') : undefined) ||
      (value ? getString(value, 'property_id') || getString(value, 'property') : undefined) ||
      (number ? getString(number, 'property_id') || getString(number, 'property') : undefined),
    colorTheme:
      getString(format, 'colorTheme') ||
      getString(format, 'color_theme') ||
      getString(format, 'color'),
    showDataLabels:
      getBoolean(format, 'axisShowDataLabels') ??
      getBoolean(format, 'show_data_labels') ??
      getBoolean(format, 'showDataLabels'),
    colorByValue:
      getBoolean(format, 'weightColorValue') ??
      getBoolean(format, 'color_by_value') ??
      getBoolean(format, 'colorByValue'),
    smoothLine:
      getBoolean(format, 'smoothLine') ?? getBoolean(format, 'smooth_line'),
    caption: getString(format, 'caption') || getString(config, 'caption'),
    showCaption:
      getBoolean(format, 'showCaption') ?? getBoolean(format, 'show_caption'),
    numberColor:
      getString(format, 'numberColor') || getString(format, 'number_color'),
    donutDataLabels:
      getString(format, 'donutDataLabels') ||
      getString(format, 'donutLabels') ||
      getString(format, 'donut_labels') ||
      getString(format, 'dataLabels') ||
      getString(format, 'data_labels') ||
      (dataLabels
        ? getString(dataLabels, 'type') || getString(dataLabels, 'mode')
        : undefined),
    height: getString(format, 'height') || getString(config, 'height'),
    gridLines:
      getString(format, 'gridLines') ||
      getString(format, 'grid_lines') ||
      getString(config, 'grid_lines'),
    axisLabels:
      getString(format, 'axisLabels') ||
      getString(format, 'axis_labels') ||
      getString(config, 'axis_labels'),
    legendPosition:
      getString(format, 'legendPosition') ||
      getString(format, 'legend_position') ||
      getString(format, 'legend') ||
      (legend
        ? getString(legend, 'position') || getString(legend, 'placement')
        : undefined),
    showLegend:
      getBoolean(format, 'showLegend') ??
      getBoolean(format, 'show_legend') ??
      (legend
        ? getBoolean(legend, 'show') ?? getBoolean(legend, 'visible')
        : undefined),
    sort:
      getString(format, 'sort') ||
      getString(config, 'sort') ||
      (dataConfig ? getString(dataConfig, 'sort') : undefined),
    aggregator:
      (value ? getString(value, 'aggregator') : undefined) ||
      (number ? getString(number, 'aggregator') : undefined) ||
      getString(format, 'aggregator') ||
      getString(config, 'aggregator'),
    valueLabel:
      getString(format, 'valueLabel') ||
      getString(format, 'value_label') ||
      getString(config, 'valueLabel') ||
      getString(config, 'value_label'),
    valueSuffix:
      getString(format, 'valueSuffix') ||
      getString(format, 'value_suffix') ||
      getString(config, 'valueSuffix') ||
      getString(config, 'value_suffix'),
    showValue:
      getBoolean(format, 'showValue') ??
      getBoolean(format, 'show_value') ??
      getBoolean(format, 'showCenterValue') ??
      getBoolean(format, 'show_center_value') ??
      getBoolean(format, 'showAggregateValue') ??
      getBoolean(format, 'show_aggregate_value') ??
      (centerValue
        ? getBoolean(centerValue, 'show') ?? getBoolean(centerValue, 'visible')
        : undefined),
    showValueLabel:
      getBoolean(format, 'showValueLabel') ??
      getBoolean(format, 'show_value_label') ??
      getBoolean(format, 'showCenterValueLabel') ??
      getBoolean(format, 'show_center_value_label') ??
      getBoolean(format, 'showAggregateValueLabel') ??
      getBoolean(format, 'show_aggregate_value_label') ??
      (centerValue
        ? getBoolean(centerValue, 'show_label') ??
          getBoolean(centerValue, 'showLabel')
        : undefined),
    hideLineFillArea:
      getBoolean(format, 'hideLineFillArea') ??
      getBoolean(format, 'hide_line_fill_area'),
    hideTitle:
      getBoolean(format, 'hideTitle') ?? getBoolean(format, 'hide_title'),
    yAxisMin: getNumber(format, 'y_axis_min') ?? getNumber(format, 'yAxisMin'),
    yAxisMax: getNumber(format, 'y_axis_max') ?? getNumber(format, 'yAxisMax'),
  }
}

const richTextsToPlainText = (value: unknown): string =>
  Array.isArray(value)
    ? value
        .map((richText) =>
          isRecord(richText) && typeof richText.plain_text === 'string'
            ? richText.plain_text
            : ''
        )
        .join('')
    : ''

const propertyToLabel = (property: unknown): string => {
  if (!isRecord(property)) return ''

  switch (getString(property, 'type')) {
    case 'title':
      return richTextsToPlainText(property.title)
    case 'rich_text':
      return richTextsToPlainText(property.rich_text)
    case 'select':
      return isRecord(property.select) ? getString(property.select, 'name') || '' : ''
    case 'status':
      return isRecord(property.status) ? getString(property.status, 'name') || '' : ''
    case 'date':
      return isRecord(property.date) ? getString(property.date, 'start') || '' : ''
    case 'number':
      return typeof property.number === 'number' ? String(property.number) : ''
    default:
      return ''
  }
}

const propertyToNumber = (property: unknown): number | null => {
  if (!isRecord(property)) return null

  switch (getString(property, 'type')) {
    case 'number':
      return typeof property.number === 'number' ? property.number : null
    case 'formula':
      return isRecord(property.formula) &&
        property.formula.type === 'number' &&
        typeof property.formula.number === 'number'
        ? property.formula.number
        : null
    case 'rollup':
      return isRecord(property.rollup) &&
        property.rollup.type === 'number' &&
        typeof property.rollup.number === 'number'
        ? property.rollup.number
        : null
    default:
      return null
  }
}

const propertyHasValue = (property: unknown): boolean => {
  if (!isRecord(property)) return false

  switch (getString(property, 'type')) {
    case 'title':
      return richTextsToPlainText(property.title).trim().length > 0
    case 'rich_text':
      return richTextsToPlainText(property.rich_text).trim().length > 0
    case 'number':
      return typeof property.number === 'number'
    case 'select':
      return isRecord(property.select)
    case 'status':
      return isRecord(property.status)
    case 'multi_select':
      return Array.isArray(property.multi_select) && property.multi_select.length > 0
    case 'date':
      return isRecord(property.date) && typeof property.date.start === 'string'
    case 'checkbox':
      return typeof property.checkbox === 'boolean'
    case 'url':
      return typeof property.url === 'string' && property.url.length > 0
    case 'email':
      return typeof property.email === 'string' && property.email.length > 0
    case 'phone_number':
      return typeof property.phone_number === 'string' && property.phone_number.length > 0
    case 'files':
      return Array.isArray(property.files) && property.files.length > 0
    case 'relation':
      return Array.isArray(property.relation) && property.relation.length > 0
    case 'people':
      return Array.isArray(property.people) && property.people.length > 0
    case 'formula':
      return isRecord(property.formula) && property.formula[property.formula.type as string] !== null
    case 'rollup':
      return isRecord(property.rollup) && property.rollup[property.rollup.type as string] !== null
    default:
      return propertyToLabel(property).trim().length > 0 || propertyToNumber(property) !== null
  }
}

const propertyToAggregateKey = (property: unknown): string => {
  if (!isRecord(property)) return ''

  const label = propertyToLabel(property).trim()
  if (label) return label
  const numeric = propertyToNumber(property)
  if (numeric !== null) return String(numeric)

  switch (getString(property, 'type')) {
    case 'checkbox':
      return typeof property.checkbox === 'boolean' ? String(property.checkbox) : ''
    case 'url':
      return typeof property.url === 'string' ? property.url : ''
    case 'email':
      return typeof property.email === 'string' ? property.email : ''
    case 'phone_number':
      return typeof property.phone_number === 'string' ? property.phone_number : ''
    default:
      return ''
  }
}

const normalizeAggregator = (aggregator: string | undefined): string => {
  const value = (aggregator || 'sum').toLowerCase().replace(/[\s-]/g, '_')
  const aliases: Record<string, string> = {
    count: 'count_values',
    count_all: 'count_all',
    count_values: 'count_values',
    count_unique: 'count_unique',
    count_unique_values: 'count_unique',
    unique: 'count_unique',
    count_empty: 'count_empty',
    empty: 'count_empty',
    count_not_empty: 'count_not_empty',
    not_empty: 'count_not_empty',
    percent_empty: 'percent_empty',
    percentage_empty: 'percent_empty',
    percent_not_empty: 'percent_not_empty',
    percentage_not_empty: 'percent_not_empty',
    sum: 'sum',
    average: 'average',
    mean: 'average',
    median: 'median',
    min: 'min',
    minimum: 'min',
    max: 'max',
    maximum: 'max',
    range: 'range',
  }
  return aliases[value] || value
}

const aggregationLabels: Record<string, string> = {
  count_all: 'すべてカウント',
  count_values: '値の数をカウント',
  count_unique: '一意の値の数をカウント',
  count_empty: '未入力をカウント',
  count_not_empty: '未入力以外をカウント',
  percent_empty: '未入力の割合',
  percent_not_empty: '未入力以外の割合',
  sum: '合計',
  average: '平均',
  median: '中央値',
  min: '最小',
  max: '最大',
  range: '範囲',
}

const calculateAggregate = (
  pages: UnknownRecord[],
  valueProperty: string,
  aggregator: string | undefined
): { value: number; normalizedAggregator: string; suffix?: string } => {
  const normalizedAggregator = normalizeAggregator(aggregator)
  const properties = pages.map((page) => {
    const pageProperties = isRecord(page.properties) ? page.properties : {}
    return pageProperties[valueProperty]
  })
  const numbers = properties
    .map((property) => propertyToNumber(property))
    .filter((value): value is number => value !== null)
  const filled = properties.filter(propertyHasValue)
  const emptyCount = properties.length - filled.length

  switch (normalizedAggregator) {
    case 'count_all':
      return { value: pages.length, normalizedAggregator }
    case 'count_values':
      return { value: filled.length, normalizedAggregator }
    case 'count_unique':
      return {
        value: new Set(
          properties.map(propertyToAggregateKey).filter((value) => value.length > 0)
        ).size,
        normalizedAggregator,
      }
    case 'count_empty':
      return { value: emptyCount, normalizedAggregator }
    case 'count_not_empty':
      return { value: filled.length, normalizedAggregator }
    case 'percent_empty':
      return {
        value: pages.length ? (emptyCount / pages.length) * 100 : 0,
        normalizedAggregator,
        suffix: '%',
      }
    case 'percent_not_empty':
      return {
        value: pages.length ? (filled.length / pages.length) * 100 : 0,
        normalizedAggregator,
        suffix: '%',
      }
    case 'average':
      return {
        value: numbers.length
          ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length
          : 0,
        normalizedAggregator,
      }
    case 'median': {
      const sorted = [...numbers].sort((a, b) => a - b)
      const center = Math.floor(sorted.length / 2)
      return {
        value: sorted.length
          ? sorted.length % 2
            ? sorted[center]
            : (sorted[center - 1] + sorted[center]) / 2
          : 0,
        normalizedAggregator,
      }
    }
    case 'min':
      return { value: numbers.length ? Math.min(...numbers) : 0, normalizedAggregator }
    case 'max':
      return { value: numbers.length ? Math.max(...numbers) : 0, normalizedAggregator }
    case 'range':
      return {
        value: numbers.length ? Math.max(...numbers) - Math.min(...numbers) : 0,
        normalizedAggregator,
      }
    case 'sum':
    default:
      return {
        value: numbers.reduce((sum, value) => sum + value, 0),
        normalizedAggregator: 'sum',
      }
  }
}

const resolvePropertyName = (
  properties: UnknownRecord,
  propertyRef: string | undefined
): string | undefined => {
  if (!propertyRef) return undefined
  if (properties[propertyRef]) return propertyRef

  return Object.entries(properties).find(([, property]) => {
    if (!isRecord(property)) return false
    return getString(property, 'id') === propertyRef || getString(property, 'name') === propertyRef
  })?.[0]
}

const sortChartData = (
  data: DatabaseChartItem[],
  sort: string | undefined
): DatabaseChartItem[] => {
  if (!sort || sort === 'manual') return data

  const sorted = [...data]
  switch (sort) {
    case 'x_ascending':
    case 'name_ascending':
    case 'label_ascending':
      return sorted.sort((a, b) => a.Label.localeCompare(b.Label, 'ja'))
    case 'x_descending':
    case 'name_descending':
    case 'label_descending':
      return sorted.sort((a, b) => b.Label.localeCompare(a.Label, 'ja'))
    case 'y_ascending':
    case 'value_ascending':
      return sorted.sort((a, b) => a.Value - b.Value)
    case 'y_descending':
    case 'value_descending':
      return sorted.sort((a, b) => b.Value - a.Value)
    default:
      return data
  }
}

async function _getDatabaseChart(
  databaseId: string,
  title: string
): Promise<DatabaseChart | undefined> {
  try {
    const database = await client.databases.retrieve({
      database_id: databaseId,
    })

    const chartConfig =
      getChartConfig(database) || (await fetchChartConfigFromViewsApi(databaseId))
    const chartConfigProperties = chartPropertiesFromConfig(chartConfig)
    const chartType = chartTypeFromConfig(chartConfig)
    const properties = isRecord(database.properties) ? database.properties : {}
    const propertyEntries = Object.entries(properties).filter((entry) =>
      isRecord(entry[1])
    ) as Array<[string, UnknownRecord]>
    const labelProperty =
      resolvePropertyName(properties, chartConfigProperties.labelProperty) ||
      propertyEntries.find(([, property]) => property.type === 'title')?.[0] ||
      propertyEntries.find(([, property]) =>
        ['select', 'status', 'rich_text', 'date'].includes(
          getString(property, 'type') || ''
        )
      )?.[0]
    const valueProperty =
      resolvePropertyName(properties, chartConfigProperties.valueProperty) ||
      propertyEntries.find(([, property]) =>
        ['number', 'formula', 'rollup'].includes(
          getString(property, 'type') || ''
        )
      )?.[0]

    if (!labelProperty || !valueProperty) return undefined

    let results: UnknownRecord[] = []
    let startCursor: string | undefined
    while (true) {
      const params: requestParams.QueryDatabase = {
        database_id: databaseId,
        page_size: 100,
        start_cursor: startCursor,
      }
      const response = await client.databases.query(params)
      const responseResults = response.results.filter(isRecord)

      results = results.concat(responseResults)
      if (!response.has_more) break
      startCursor = response.next_cursor || undefined
    }

    const data = results
      .map((page) => {
        const properties = isRecord(page.properties) ? page.properties : {}
        const label = propertyToLabel(properties[labelProperty]).trim()
        const value = propertyToNumber(properties[valueProperty])
        if (!label || value === null) return null
        return { Label: label, Value: value }
      })
      .filter((item): item is DatabaseChartItem => item !== null)

    const type =
      chartType || chartTypeByDatabaseId[databaseId] || chartTypeByTitle(title, data)
    if (type !== 'number' && !data.length) return undefined

    const aggregate = calculateAggregate(
      results,
      valueProperty,
      chartConfigProperties.aggregator
    )
    const aggregateLabel =
      aggregationLabels[aggregate.normalizedAggregator] || aggregate.normalizedAggregator
    const valueLabel =
      chartConfigProperties.valueLabel || `${aggregateLabel}/${valueProperty}`
    const total = data.reduce((sum, item) => sum + item.Value, 0)
    const sortedData = sortChartData(data, chartConfigProperties.sort)
    const chartData: DatabaseChartItem[] =
      type === 'number'
        ? [
            {
              Label: valueLabel,
              Value: aggregate.value,
            },
          ]
        : sortedData

    return {
      Title: title,
      Type: type,
      LabelProperty: labelProperty,
      ValueProperty: valueProperty,
      Data: chartData,
      Total: total,
      ColorTheme: chartConfigProperties.colorTheme,
      ShowDataLabels: chartConfigProperties.showDataLabels,
      ColorByValue: chartConfigProperties.colorByValue,
      SmoothLine: chartConfigProperties.smoothLine,
      Caption: chartConfigProperties.caption,
      ShowCaption: chartConfigProperties.showCaption,
      NumberColor: chartConfigProperties.numberColor,
      DonutDataLabels: chartConfigProperties.donutDataLabels,
      Height: chartConfigProperties.height,
      GridLines: chartConfigProperties.gridLines,
      AxisLabels: chartConfigProperties.axisLabels,
      LegendPosition: chartConfigProperties.legendPosition,
      ShowLegend: chartConfigProperties.showLegend,
      Sort: chartConfigProperties.sort,
      Aggregator: aggregate.normalizedAggregator,
      ValueLabel: valueLabel,
      ValueSuffix: chartConfigProperties.valueSuffix || aggregate.suffix,
      ShowValue: chartConfigProperties.showValue,
      ShowValueLabel: chartConfigProperties.showValueLabel,
      HideLineFillArea: chartConfigProperties.hideLineFillArea,
      HideTitle: chartConfigProperties.hideTitle,
      YAxisMin: chartConfigProperties.yAxisMin,
      YAxisMax: chartConfigProperties.yAxisMax,
    }
  } catch (error) {
    console.warn(`Failed to build database chart: ${databaseId}`, error)
    return undefined
  }
}

async function _getTableRows(blockId: string): Promise<TableRow[]> {
  let results: responses.BlockObject[] = []

  if (fs.existsSync(`tmp/${blockId}.json`)) {
    results = JSON.parse(fs.readFileSync(`tmp/${blockId}.json`, 'utf-8'))
  } else {
    const params: requestParams.RetrieveBlockChildren = {
      block_id: blockId,
    }

    while (true) {
      const res = (await client.blocks.children.list(
        params as any // eslint-disable-line @typescript-eslint/no-explicit-any
      )) as responses.RetrieveBlockChildrenResponse

      results = results.concat(res.results)

      if (!res.has_more) {
        break
      }

      params['start_cursor'] = res.next_cursor as string
    }
  }

  return results.map((blockObject) => {
    const tableRow: TableRow = {
      Id: blockObject.id,
      Type: blockObject.type,
      HasChildren: blockObject.has_children,
      Cells: [],
    }

    if (blockObject.type === 'table_row' && blockObject.table_row) {
      const cells: TableCell[] = blockObject.table_row.cells.map((cell) => {
        const tableCell: TableCell = {
          RichTexts: cell.map(_buildRichText),
          ColSpan:
            cell.col_span || cell.colspan || cell.column_span || undefined,
          RowSpan: cell.row_span || cell.rowspan || undefined,
        }

        return tableCell
      })

      tableRow.Cells = cells
    }

    return tableRow
  })
}

async function _getColumns(blockId: string): Promise<Column[]> {
  let results: responses.BlockObject[] = []

  if (fs.existsSync(`tmp/${blockId}.json`)) {
    results = JSON.parse(fs.readFileSync(`tmp/${blockId}.json`, 'utf-8'))
  } else {
    const params: requestParams.RetrieveBlockChildren = {
      block_id: blockId,
    }

    while (true) {
      const res = (await client.blocks.children.list(
        params as any // eslint-disable-line @typescript-eslint/no-explicit-any
      )) as responses.RetrieveBlockChildrenResponse

      results = results.concat(res.results)

      if (!res.has_more) {
        break
      }

      params['start_cursor'] = res.next_cursor as string
    }
  }

  return await Promise.all(
    results.map(async (blockObject) => {
      const children = await getAllBlocksByBlockId(blockObject.id)

      const column: Column = {
        Id: blockObject.id,
        Type: blockObject.type,
        HasChildren: blockObject.has_children,
        Children: children,
      }

      return column
    })
  )
}

async function _getSyncedBlockChildren(block: Block): Promise<Block[]> {
  let originalBlock: Block = block
  if (
    block.SyncedBlock &&
    block.SyncedBlock.SyncedFrom &&
    block.SyncedBlock.SyncedFrom.BlockId
  ) {
    try {
      originalBlock = await getBlock(block.SyncedBlock.SyncedFrom.BlockId)
    } catch (err) {
      console.log(`Could not retrieve the original synced_block. error: ${err}`)
      return []
    }
  }

  const children = await getAllBlocksByBlockId(originalBlock.Id)
  return children
}

function _validPageObject(pageObject: responses.PageObject): boolean {
  const prop = pageObject.properties
  return (
    !!prop.Page.title &&
    prop.Page.title.length > 0 &&
    !!prop.Slug.rich_text &&
    prop.Slug.rich_text.length > 0 &&
    !!prop.Date.date
  )
}

function _buildPost(pageObject: responses.PageObject): Post {
  const prop = pageObject.properties

  const icon = pageObject.icon as responses.Emoji
  const emoji: Emoji = { Type: icon?.type || 'emoji', Emoji: icon?.emoji || '', Url: icon?.external?.url || '' }

  const cover: FileObject = { Url: pageObject.cover?.external?.url || '' }

  let featuredImage: FileObject | null = null
  if (
    prop.FeaturedImage.files &&
    prop.FeaturedImage.files.length > 0 &&
    prop.FeaturedImage.files[0].file
  ) {
    featuredImage = {
      Url: prop.FeaturedImage.files[0].file.url,
      ExpiryTime: prop.FeaturedImage.files[0].file.expiry_time,
    }
  }

  const post: Post = {
    PageId: pageObject.id,
    Title: prop.Page.title ? prop.Page.title[0].plain_text : '',
    Icon: emoji,
    Cover: cover,
    Slug: prop.Slug.rich_text ? prop.Slug.rich_text[0].plain_text : '',
    Date: prop.Date.date ? prop.Date.date.start : '',
    Tags: prop.Tags.multi_select ? prop.Tags.multi_select : [],
    Excerpt:
      prop.Excerpt.rich_text && prop.Excerpt.rich_text.length > 0
        ? prop.Excerpt.rich_text.map((t) => t.plain_text).join('')
        : '',
    FeaturedImage: featuredImage,
    Rank: prop.Rank.number ? prop.Rank.number : 0,
  }

  return post
}

function _buildRichText(richTextObject: responses.RichTextObject): RichText {
  const annotation: Annotation = {
    Bold: richTextObject.annotations.bold,
    Italic: richTextObject.annotations.italic,
    Strikethrough: richTextObject.annotations.strikethrough,
    Underline: richTextObject.annotations.underline,
    Code: richTextObject.annotations.code,
    Color: richTextObject.annotations.color,
  }

  const richText: RichText = {
    Annotation: annotation,
    PlainText: richTextObject.plain_text,
    Href: richTextObject.href,
  }

  if (richTextObject.type === 'text' && richTextObject.text) {
    const text: Text = {
      Content: richTextObject.text.content,
    }

    if (richTextObject.text.link) {
      text.Link = {
        Url: richTextObject.text.link.url,
      }
    }

    richText.Text = text
  } else if (richTextObject.type === 'equation' && richTextObject.equation) {
    const equation: Equation = {
      Expression: richTextObject.equation.expression,
    }
    richText.Equation = equation
  } else if (richTextObject.type === 'mention' && richTextObject.mention) {
    const mention: Mention = {
      Type: richTextObject.mention.type,
    }

    if (richTextObject.mention.type === 'page' && richTextObject.mention.page) {
      const reference: Reference = {
        Id: richTextObject.mention.page.id,
      }
      mention.Page = reference
    } else if (
      richTextObject.mention.type === 'database' &&
      richTextObject.mention.database
    ) {
      const reference: Reference = {
        Id: richTextObject.mention.database.id,
      }
      mention.Database = reference
    } else if (
      richTextObject.mention.type === 'link_preview' &&
      richTextObject.mention.link_preview
    ) {
      mention.LinkPreview = {
        Url: richTextObject.mention.link_preview.url,
      }
    }

    richText.Mention = mention
  }

  return richText
}
