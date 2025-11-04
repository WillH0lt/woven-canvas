import type { LinkStyle, Page } from '@prisma/client';
import { ScrollDirection, TextDecoration } from '@prisma/client';

interface Template {
  pages: Omit<Page, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'siteId' | 'versionId'>[];
  linkStyle: Omit<
    LinkStyle,
    'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'pageId' | 'className'
  >;
}

export const blankTemplate: Template = {
  pages: [
    {
      path: '',
      title: '',
      description: '',
      ogImage: '',
      previewImage: '',
      backgroundColor: '#ffffff',
      scrollDirection: ScrollDirection.Vertical,
      minWidth: 500,
      maxWidth: 0,
      minHeight: 500,
      maxHeight: 0,
    },
  ],
  linkStyle: {
    color: '#6a58f2',
    name: 'Default',
    decoration: TextDecoration.None,
    hoverColor: '#6a58f2',
    hoverDecoration: TextDecoration.Underline,
    isDefault: true,
    rank: '0|hzzzzz:',
  },
};
