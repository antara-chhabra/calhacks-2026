import { createElement, useEffect, useId, useState } from 'react';
import type { JSX } from 'react';
import type { SkinSpec } from '@fc/contracts';
import { loadSkinParts, type SkinParts } from './assets';
import { composePortrait, type PortraitPose } from './compose';

/** Static SVG portrait built from the same parts, palette substitution and transforms as the Pixi rig. */
export function FighterPortrait(props: { skin: SkinSpec; pose: PortraitPose; size: number; flip?: boolean }): JSX.Element {
  const { skin, pose, size, flip } = props;
  const uid = useId();
  const [parts, setParts] = useState<SkinParts | null>(null);
  const skinKey = JSON.stringify(skin);
  useEffect(() => {
    let live = true;
    loadSkinParts(skin).then((p) => { if (live) setParts(p); }).catch((e: unknown) => console.warn('[arena] portrait load failed', e));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skinKey]);
  const common = { width: size, height: size, xmlns: 'http://www.w3.org/2000/svg', 'data-portrait': pose, role: 'img', 'aria-hidden': true, style: { display: 'block', overflow: 'hidden' } } as const;
  if (!parts) return createElement('svg', { ...common, viewBox: '0 0 1 1', 'data-loading': '' });
  const c = composePortrait({ manifest: parts.manifest, svg: parts.svg, slotKeys: parts.slotKeys, skin, pose, idPrefix: uid, flip });
  return createElement('svg', {
    ...common, viewBox: c.viewBox,
    dangerouslySetInnerHTML: { __html: c.inner },
  });
}
