export type Surface = "portrait" | "square" | "story" | "carousel" | "reel";

export type MediaKind = "photo" | "video";

export type TemplateKind = "post" | "reel";

export type Slot = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  radius?: number;
  frame?: boolean;
  fit?: "cover" | "contain";
};

export type TextLayer = {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  align?: "left" | "center" | "right";
  italic?: boolean;
  weight?: number;
  width?: number;
};

export type TemplatePage = {
  id: string;
  name: string;
  background: string;
  texture?: "grain" | "paper" | "vignette";
  slots: Slot[];
  text: TextLayer[];
};

export type TemplateDefinition = {
  id: string;
  name: string;
  kind: TemplateKind;
  surface: Surface;
  pages: TemplatePage[];
  mediaCount: number;
  accent: string;
  description: string;
};

export type UploadedMedia = {
  id: string;
  name: string;
  type: MediaKind;
  url: string;
};

export type PabloFacet = {
  id: string;
  points: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  opacity: number;
  rotate: number;
  blend: "multiply" | "screen" | "overlay";
};

export type PabloStyle = "prism-portrait" | "playful-mask" | "bauhaus-profile";

export type PabloLinework = {
  id: string;
  d: string;
  color: string;
  width: number;
  opacity: number;
  fill?: string;
};

export type PabloMotif = {
  id: string;
  kind: "eye" | "lip" | "circle" | "profile";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  accent: string;
  rotate: number;
  opacity: number;
};

export type PabloEffect = {
  seed: number;
  style: PabloStyle;
  intensity: number;
  facets: PabloFacet[];
  linework: PabloLinework[];
  motifs?: PabloMotif[];
};

export type ProjectState = {
  templateId: string;
  activePage: number;
  media: Record<string, UploadedMedia>;
  text: Record<string, string>;
  background: string;
  imageFit: "cover" | "contain";
  grain: boolean;
  blurBackdrop: boolean;
  pabloEffects: Record<string, PabloEffect | undefined>;
};
