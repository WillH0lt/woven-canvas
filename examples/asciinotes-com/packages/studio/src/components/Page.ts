import { component, field } from '@lastolivegames/becsy';
import { ScrollDirection } from '@prisma/client';

@component
class Page {
  @field.dynamicString(36) declare public id: string;

  @field.dynamicString(36) declare public siteId: string;

  @field.dynamicString(36) declare public versionId: string;

  @field.dynamicString(256) declare public title: string;

  @field.dynamicString(256) declare public description: string;

  @field.dynamicString(256) declare public ogImage: string;

  @field.dynamicString(256) declare public previewImage: string;

  @field.dynamicString(7) declare public backgroundColor: string;

  @field.uint16 declare public minWidth: number;

  @field.uint16 declare public maxWidth: number;

  @field.uint16 declare public minHeight: number;

  @field.uint16 declare public maxHeight: number;

  @field.staticString(Object.values(ScrollDirection))
  declare public scrollDirection: ScrollDirection;

  @field.dynamicString(128) declare public path: string;

  // ununsed fields
  @field.dynamicString(128) declare public createdBy: string;

  @field.dynamicString(128) declare public createdAt: string;

  @field.dynamicString(128) declare public updatedAt: string;
}

export default Page;
