import type { LinkStyle } from '@prisma/client';

export const useLinkStyles = (
  linkStyles: MaybeRefOrGetter<LinkStyle[]>,
): { cssString: ComputedRef<string> } => {
  function getCssString(selector: string, linkStyle: LinkStyle): string {
    return `
      ${selector}, ${selector} span {
        color: ${linkStyle.color} !important;
        text-decoration: ${linkStyle.decoration.toLowerCase()};
        transition: color 0.2s;
      }

      ${selector}:hover, ${selector} span:hover {
        color: ${linkStyle.hoverColor} !important;
        text-decoration: ${linkStyle.hoverDecoration.toLowerCase()};
      }
    `;
  }

  const cssString = computed(() => {
    const styles = toValue(linkStyles);

    // const defaultStyle = styles.find((s) => s.isDefault);
    // if (defaultStyle) {
    //   cssClasses.push(getCssString('.tiptap a', defaultStyle));
    // }

    const cssClasses = styles.map((s) => {
      const selector = `.${s.className}`;
      return getCssString(selector, s);
    });

    return cssClasses.join('\n');
  });

  return { cssString };
};
