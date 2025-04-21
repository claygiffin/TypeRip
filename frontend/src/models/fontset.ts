// A FontSet represents a group of fonts that belong to the same Collection or Family.

import type { Designer, Font } from "../scripts/typerip";

export class FontSet {
  constructor(
    public name: string,
    public designers: Designer[],
    public fonts: Font[],
    public sampleText?: string
  ) { }
}