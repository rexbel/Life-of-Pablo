import { ChangeEvent, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  Camera,
  Download,
  Folder,
  Grid2X2,
  Home,
  ImagePlus,
  Layers,
  Palette,
  Plus,
  RefreshCw,
  Settings,
  Share2,
  Sparkles,
  Trash2,
  Type,
  Upload,
  Wand2,
} from "lucide-react";
import { templates } from "./data/templates";
import { exportNodeAsPng } from "./lib/export";
import { createPabloEffect, createPabloEffectFromSeed } from "./lib/pablo";
import { clamp, cn } from "./lib/utils";
import type { MediaKind, ProjectState, Slot, Surface, TemplateDefinition, TemplatePage, UploadedMedia } from "./types";

const filters: Array<Surface | "all"> = ["all", "portrait", "carousel", "story", "square", "reel"];
const placeholderGradients = [
  "linear-gradient(135deg,#9db3b7,#e9d6ad 48%,#465b42)",
  "linear-gradient(135deg,#2f3a2f,#c7a068 52%,#0e0e0c)",
  "linear-gradient(135deg,#d7e4e6,#6da8b1 48%,#d8ba8b)",
  "linear-gradient(135deg,#eee5d0,#b4a386 45%,#51483b)",
  "linear-gradient(135deg,#1f2d32,#80979a 52%,#d1c6a4)",
];

function initialProject(template: TemplateDefinition): ProjectState {
  return {
    templateId: template.id,
    activePage: 0,
    media: {},
    text: Object.fromEntries(template.pages.flatMap((page) => page.text.map((layer) => [layer.id, layer.text]))),
    background: template.pages[0].background,
    imageFit: "cover",
    grain: Boolean(template.pages[0].texture),
    blurBackdrop: false,
    pabloEffects: {},
  };
}

export function App() {
  const [tab, setTab] = useState<"home" | "templates" | "projects" | "more">("home");
  const [filter, setFilter] = useState<Surface | "all">("all");
  const [selectedId, setSelectedId] = useState(templates[0].id);
  const selectedTemplate = templates.find((template) => template.id === selectedId) ?? templates[0];
  const [project, setProject] = useState<ProjectState>(() => initialProject(selectedTemplate));
  const [savedProjects, setSavedProjects] = useState<ProjectState[]>(() => {
    const saved = window.localStorage.getItem("pablo-projects");
    return saved ? (JSON.parse(saved) as ProjectState[]) : [];
  });
  const previewRef = useRef<HTMLDivElement>(null);

  const activeTemplate = templates.find((template) => template.id === project.templateId) ?? templates[0];
  const page = activeTemplate.pages[project.activePage] ?? activeTemplate.pages[0];
  const visibleTemplates = templates.filter((template) => filter === "all" || template.surface === filter);

  function selectTemplate(template: TemplateDefinition) {
    setSelectedId(template.id);
    setProject(initialProject(template));
    setTab("home");
  }

  function saveDraft() {
    const next = [project, ...savedProjects.filter((item) => item.templateId !== project.templateId)].slice(0, 8);
    setSavedProjects(next);
    window.localStorage.setItem("pablo-projects", JSON.stringify(next));
  }

  async function exportPng() {
    if (!previewRef.current) return;
    await exportNodeAsPng(previewRef.current, `${activeTemplate.name.toLowerCase().replaceAll(" ", "-")}.png`);
  }

  function updateText(layerId: string, value: string) {
    setProject((current) => ({ ...current, text: { ...current.text, [layerId]: value } }));
  }

  function updateMedia(slotId: string, file: File) {
    const media: UploadedMedia = {
      id: slotId,
      name: file.name,
      type: file.type.startsWith("video") ? "video" : "photo",
      url: URL.createObjectURL(file),
    };
    setProject((current) => ({ ...current, media: { ...current.media, [slotId]: media } }));
  }

  function applyPablo() {
    setProject((current) => ({
      ...current,
      pabloEffects: { ...current.pabloEffects, [page.id]: createPabloEffect(current.pabloEffects[page.id]?.intensity ?? 0.55) },
    }));
  }

  function updatePabloIntensity(value: number) {
    setProject((current) => {
      const currentEffect = current.pabloEffects[page.id] ?? createPabloEffect(value);
      return {
        ...current,
        pabloEffects: {
          ...current.pabloEffects,
          [page.id]: createPabloEffectFromSeed(currentEffect.seed, value),
        },
      };
    });
  }

  function clearPablo() {
    setProject((current) => ({ ...current, pabloEffects: { ...current.pabloEffects, [page.id]: undefined } }));
  }

  return (
    <main className="app-shell">
      <section className="phone-frame">
        <header className="topbar">
          <button className="icon-button" aria-label="Back">
            <Layers size={22} />
          </button>
          <div>
            <p className="eyebrow">Life of Pablo</p>
            <h1>{tab === "templates" ? "Templates" : tab === "projects" ? "Projects" : tab === "more" ? "More" : "Editor"}</h1>
          </div>
          <button className="icon-button" onClick={saveDraft} aria-label="Save draft">
            <Bookmark size={21} />
          </button>
        </header>

        {tab === "home" && (
          <Editor
            template={activeTemplate}
            page={page}
            project={project}
            previewRef={previewRef}
            onPage={(index) => setProject((current) => ({ ...current, activePage: index }))}
            onMedia={updateMedia}
            onText={updateText}
            onApplyPablo={applyPablo}
            onIntensity={updatePabloIntensity}
            onClearPablo={clearPablo}
            onExport={exportPng}
            onProject={(patch) => setProject((current) => ({ ...current, ...patch }))}
          />
        )}

        {tab === "templates" && (
          <section className="screen-section">
            <div className="filter-row" role="tablist" aria-label="Template filters">
              {filters.map((item) => (
                <button key={item} className={cn("chip", filter === item && "chip-active")} onClick={() => setFilter(item)}>
                  {item}
                </button>
              ))}
            </div>
            <div className="template-grid">
              {visibleTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} selected={template.id === project.templateId} onSelect={() => selectTemplate(template)} />
              ))}
            </div>
          </section>
        )}

        {tab === "projects" && (
          <section className="screen-section">
            <div className="panel-head">
              <h2>Drafts</h2>
              <button className="small-button" onClick={saveDraft}>
                Save current
              </button>
            </div>
            {savedProjects.length === 0 ? (
              <div className="empty-state">
                <Folder size={32} />
                <p>Saved edits will live here.</p>
              </div>
            ) : (
              <div className="project-list">
                {savedProjects.map((item, index) => {
                  const template = templates.find((entry) => entry.id === item.templateId) ?? templates[0];
                  return (
                    <button key={`${item.templateId}-${index}`} className="project-row" onClick={() => { setProject(item); setTab("home"); }}>
                      <span style={{ background: template.accent }} />
                      <strong>{template.name}</strong>
                      <small>{template.kind} / {template.surface}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === "more" && (
          <section className="screen-section">
            <div className="settings-panel">
              <Settings size={28} />
              <h2>Pablo Studio</h2>
              <p>shadcn/ui-referenced, mobile-first tools for social templates, still-photo reels, and tasteful cubist accents.</p>
            </div>
          </section>
        )}

        <nav className="bottom-nav" aria-label="Primary">
          <NavButton icon={<Home size={24} />} label="Home" active={tab === "home"} onClick={() => setTab("home")} />
          <NavButton icon={<Grid2X2 size={24} />} label="Templates" active={tab === "templates"} onClick={() => setTab("templates")} />
          <NavButton icon={<Folder size={24} />} label="Projects" active={tab === "projects"} onClick={() => setTab("projects")} />
          <NavButton icon={<Settings size={24} />} label="More" active={tab === "more"} onClick={() => setTab("more")} />
        </nav>
        <button className="floating-add" onClick={() => setTab("templates")} aria-label="Choose template">
          <Plus size={34} />
        </button>
      </section>
    </main>
  );
}

type EditorProps = {
  template: TemplateDefinition;
  page: TemplatePage;
  project: ProjectState;
  previewRef: React.RefObject<HTMLDivElement | null>;
  onPage: (index: number) => void;
  onMedia: (slotId: string, file: File) => void;
  onText: (layerId: string, value: string) => void;
  onApplyPablo: () => void;
  onIntensity: (value: number) => void;
  onClearPablo: () => void;
  onExport: () => void;
  onProject: (patch: Partial<ProjectState>) => void;
};

function Editor({ template, page, project, previewRef, onPage, onMedia, onText, onApplyPablo, onIntensity, onClearPablo, onExport, onProject }: EditorProps) {
  const pabloEffect = project.pabloEffects[page.id];
  const allSlots = useMemo(() => template.pages.flatMap((entry) => entry.slots), [template]);

  return (
    <section className="editor">
      <div className="preview-card">
        <CanvasPreview refEl={previewRef} page={page} project={project} pabloEffect={pabloEffect} />
        <div className="pager-dots" aria-label="Page selector">
          {template.pages.map((entry, index) => (
            <button key={entry.id} aria-label={entry.name} className={cn(index === project.activePage && "active")} onClick={() => onPage(index)} />
          ))}
        </div>
      </div>

      <div className="template-meta">
        <div className="template-brand">
          <div className="brand-icon"><Layers size={24} /></div>
          <div>
            <strong>{template.name}</strong>
            <p>{template.surface} <ImagePlus size={14} /> {template.mediaCount} <Layers size={14} /> {template.pages.length}</p>
          </div>
        </div>
        <div className="round-actions">
          <button aria-label="Camera"><Camera size={22} /></button>
          <button aria-label="Share"><Share2 size={22} /></button>
          <button aria-label="Save"><Bookmark size={22} /></button>
        </div>
      </div>

      <div className="tools-panel">
        <div className="panel-head">
          <h2>Media</h2>
          <span>{template.kind === "reel" ? "sequence" : "post"}</span>
        </div>
        <div className="slot-list">
          {allSlots.slice(0, 6).map((slot, index) => (
            <label className="upload-slot" key={`${slot.id}-${index}`}>
              <Upload size={17} />
              <span>{slot.id}</span>
              <input type="file" accept="image/*,video/*" onChange={(event) => handleFile(event, slot.id, onMedia)} />
            </label>
          ))}
        </div>
      </div>

      <div className="tools-panel">
        <div className="panel-head">
          <h2><Type size={18} /> Text</h2>
          <span>{page.text.length || 0} layers</span>
        </div>
        {page.text.length === 0 ? <p className="muted">This template keeps the frame visual-first.</p> : page.text.map((layer) => (
          <input key={layer.id} className="text-input" value={project.text[layer.id] ?? layer.text} onChange={(event) => onText(layer.id, event.target.value)} />
        ))}
      </div>

      <div className="tools-panel">
        <div className="panel-head">
          <h2><Palette size={18} /> Style</h2>
          <button className="small-button" onClick={onExport}><Download size={15} /> PNG</button>
        </div>
        <div className="style-grid">
          {["#050505", "#f1eee7", "#d9c59d", "#24352d", "#354c5c"].map((color) => (
            <button key={color} aria-label={`Set background ${color}`} className="swatch" style={{ background: color }} onClick={() => onProject({ background: color })} />
          ))}
          <button className={cn("toggle", project.grain && "toggle-on")} onClick={() => onProject({ grain: !project.grain })}>Grain</button>
          <button className={cn("toggle", project.blurBackdrop && "toggle-on")} onClick={() => onProject({ blurBackdrop: !project.blurBackdrop })}>Blur</button>
          <button className={cn("toggle", project.imageFit === "contain" && "toggle-on")} onClick={() => onProject({ imageFit: project.imageFit === "cover" ? "contain" : "cover" })}>Fit</button>
        </div>
      </div>

      <div className="pablo-panel">
        <button className="pablo-button" onClick={onApplyPablo}>
          <Wand2 size={20} />
          Life of Pablo
        </button>
        <div className="pablo-controls">
          <button onClick={onApplyPablo}><RefreshCw size={16} /> Reroll</button>
          <label>
            <Sparkles size={16} />
            <input type="range" min="0.25" max="0.9" step="0.05" value={pabloEffect?.intensity ?? 0.55} onChange={(event) => onIntensity(Number(event.target.value))} />
          </label>
          <button onClick={onClearPablo}><Trash2 size={16} /> Clear</button>
        </div>
      </div>
    </section>
  );
}

function CanvasPreview({ refEl, page, project, pabloEffect }: { refEl: React.RefObject<HTMLDivElement | null>; page: TemplatePage; project: ProjectState; pabloEffect: ProjectState["pabloEffects"][string] }) {
  return (
    <div className="canvas" ref={refEl} style={{ background: project.background || page.background }}>
      <div className={cn("canvas-inner", project.grain && "with-grain", page.texture === "paper" && "with-paper", page.texture === "vignette" && "with-vignette")}>
        {page.slots.map((slot, index) => (
          <MediaSlot key={slot.id} slot={slot} media={project.media[slot.id]} fit={project.imageFit} index={index} blurBackdrop={project.blurBackdrop} />
        ))}
        {page.text.map((layer) => (
          <div
            key={layer.id}
            className="text-layer"
            style={{
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              width: `${layer.width ?? 60}%`,
              color: layer.color,
              fontSize: `${layer.size}cqw`,
              fontStyle: layer.italic ? "italic" : "normal",
              fontWeight: layer.weight ?? 700,
              textAlign: layer.align ?? "left",
            }}
          >
            {project.text[layer.id] ?? layer.text}
          </div>
        ))}
        {pabloEffect && <PabloOverlay effect={pabloEffect} />}
      </div>
    </div>
  );
}

function MediaSlot({ slot, media, fit, index, blurBackdrop }: { slot: Slot; media?: UploadedMedia; fit: "cover" | "contain"; index: number; blurBackdrop: boolean }) {
  const style = {
    left: `${slot.x}%`,
    top: `${slot.y}%`,
    width: `${slot.w}%`,
    height: `${slot.h}%`,
    transform: `rotate(${slot.rotation ?? 0}deg)`,
    borderRadius: `${slot.radius ?? 0.8}cqw`,
  };

  return (
    <div className={cn("media-slot", slot.frame && "framed")} style={style}>
      {media && blurBackdrop && <img className="blur-backdrop" src={media.url} alt="" />}
      {media ? (
        media.type === "video" ? (
          <video src={media.url} muted loop playsInline autoPlay style={{ objectFit: slot.fit ?? fit }} />
        ) : (
          <img src={media.url} alt={media.name} style={{ objectFit: slot.fit ?? fit }} />
        )
      ) : (
        <div className="placeholder-image" style={{ background: placeholderGradients[index % placeholderGradients.length] }}>
          <span>{slot.id}</span>
        </div>
      )}
    </div>
  );
}

function PabloOverlay({ effect }: { effect: NonNullable<ProjectState["pabloEffects"][string]> }) {
  return (
    <svg className="pablo-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {effect.facets.map((facet) => (
        <g key={facet.id} style={{ mixBlendMode: facet.blend }}>
          <polygon
            points={facet.points}
            fill={facet.color}
            opacity={facet.opacity}
            transform={`translate(${facet.x} ${facet.y}) rotate(${facet.rotate} ${facet.w / 2} ${facet.h / 2}) scale(${facet.w / 100} ${facet.h / 100})`}
          />
          <polyline
            points={facet.points}
            fill="none"
            stroke="#f6efe1"
            strokeWidth="0.35"
            opacity={clamp(facet.opacity + 0.12, 0, 0.36)}
            transform={`translate(${facet.x} ${facet.y}) rotate(${facet.rotate} ${facet.w / 2} ${facet.h / 2}) scale(${facet.w / 100} ${facet.h / 100})`}
          />
        </g>
      ))}
    </svg>
  );
}

function TemplateCard({ template, selected, onSelect }: { template: TemplateDefinition; selected: boolean; onSelect: () => void }) {
  return (
    <button className={cn("template-card", selected && "selected")} onClick={onSelect}>
      <div className="template-thumb" style={{ background: template.pages[0].background }}>
        {template.pages[0].slots.slice(0, 3).map((slot, index) => (
          <span
            key={slot.id}
            style={{
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              width: `${slot.w}%`,
              height: `${slot.h}%`,
              transform: `rotate(${slot.rotation ?? 0}deg)`,
              background: placeholderGradients[index % placeholderGradients.length],
            }}
          />
        ))}
      </div>
      <strong>{template.name}</strong>
      <small>{template.kind} / {template.surface}</small>
      <em>Free</em>
    </button>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={cn("nav-button", active && "nav-active")} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function handleFile(event: ChangeEvent<HTMLInputElement>, slotId: string, onMedia: (slotId: string, file: File) => void) {
  const file = event.target.files?.[0];
  if (file) onMedia(slotId, file);
}
