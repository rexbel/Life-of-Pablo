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

export type PabloEffect = {
  seed: number;
  intensity: number;
  facets: PabloFacet[];
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
