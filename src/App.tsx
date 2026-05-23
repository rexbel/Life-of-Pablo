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
  Link,
  Palette,
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
import { downloadBlob, nodeToPngBlob, nodeToPngFile, openBlobFallback } from "./lib/export";
import { createPabloEffect, createPabloEffectFromSeed, nextPabloStyle, pabloStyleLabels } from "./lib/pablo";
import { clamp, cn } from "./lib/utils";
import type { PabloMotif, ProjectState, Slot, Surface, TemplateDefinition, TemplatePage, UploadedMedia } from "./types";

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
  const [shareOpen, setShareOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState(templates[0].id);
  const selectedTemplate = templates.find((template) => template.id === selectedId) ?? templates[0];
  const [project, setProject] = useState<ProjectState>(() => initialProject(selectedTemplate));
  const [savedProjects, setSavedProjects] = useState<ProjectState[]>(() => {
    const saved = window.localStorage.getItem("pablo-projects");
    return saved ? (JSON.parse(saved) as ProjectState[]) : [];
  });
  const previewRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
    setStatus("Draft saved.");
  }

  function currentFileName() {
    return `${activeTemplate.name.toLowerCase().replaceAll(" ", "-")}.png`;
  }

  async function exportPng() {
    if (!previewRef.current) return;
    try {
      const blob = await nodeToPngBlob(previewRef.current);
      downloadBlob(blob, currentFileName());
      setStatus("PNG download started.");
    } catch {
      try {
        setStatus("Download was blocked. Opening the PNG instead.");
        const blob = await nodeToPngBlob(previewRef.current);
        openBlobFallback(blob);
      } catch {
        setStatus("PNG export failed. Try again after the preview finishes rendering.");
      }
    }
  }

  async function sharePng(target: "instagram" | "tiktok") {
    if (!previewRef.current) return;
    try {
      const file = await nodeToPngFile(previewRef.current, currentFileName());
      const shareData = {
        title: "Life of Pablo edit",
        text: target === "instagram" ? "Choose Instagram from the share sheet." : "Choose TikTok from the share sheet.",
        files: [file],
      };

      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share(shareData);
        setStatus(target === "instagram" ? "Choose Instagram from the share sheet." : "Choose TikTok from the share sheet.");
        setShareOpen(false);
        return;
      }

      downloadBlob(file, currentFileName());
      setStatus(target === "instagram" ? "Sharing is not available here. Save the PNG, then upload in Instagram." : "Sharing is not available here. Save the PNG, then upload in TikTok.");
    } catch {
      setStatus("Share was canceled or blocked.");
    }
  }

  async function copyProjectLink() {
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setStatus("Project link copied.");
      setShareOpen(false);
      return;
    }

    setStatus("Clipboard is not available in this browser.");
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
    setStatus(`${file.type.startsWith("video") ? "Video" : "Photo"} added to ${slotId}.`);
  }

  function firstEmptyActiveSlot() {
    return page.slots.find((slot) => !project.media[slot.id])?.id ?? page.slots[0]?.id;
  }

  function captureMedia(file: File) {
    const slotId = firstEmptyActiveSlot();
    if (slotId) updateMedia(slotId, file);
  }

  function goPrimary() {
    if (tab === "home") {
      setTab("templates");
      return;
    }
    setTab("home");
  }

  function applyPablo() {
    setProject((current) => ({
      ...current,
      pabloEffects: { ...current.pabloEffects, [page.id]: createPabloEffect(current.pabloEffects[page.id]?.intensity ?? 0.55, current.pabloEffects[page.id]?.style ?? "prism-portrait") },
    }));
  }

  function rerollPablo() {
    setProject((current) => {
      const currentEffect = current.pabloEffects[page.id];
      const nextStyle = nextPabloStyle(currentEffect?.style);
      return {
        ...current,
        pabloEffects: {
          ...current.pabloEffects,
          [page.id]: createPabloEffect(currentEffect?.intensity ?? 0.55, nextStyle),
        },
      };
    });
  }

  function updatePabloIntensity(value: number) {
    setProject((current) => {
      const currentEffect = current.pabloEffects[page.id] ?? createPabloEffect(value);
      return {
        ...current,
        pabloEffects: {
          ...current.pabloEffects,
          [page.id]: createPabloEffectFromSeed(currentEffect.seed, value, currentEffect.style ?? "prism-portrait"),
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
          <button className="icon-button" onClick={goPrimary} aria-label={tab === "home" ? "Open templates" : "Back to editor"}>
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
            onRerollPablo={rerollPablo}
            onIntensity={updatePabloIntensity}
            onClearPablo={clearPablo}
            onExport={exportPng}
            onShare={() => setShareOpen(true)}
            onCamera={() => cameraInputRef.current?.click()}
            status={status}
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
        <input
          ref={cameraInputRef}
          className="hidden-input"
          type="file"
          accept="image/*,video/*"
          capture="environment"
          onChange={(event) => handleCapturedFile(event, captureMedia)}
        />
        {shareOpen && (
          <div className="share-sheet" role="dialog" aria-label="Share export">
            <button className="sheet-scrim" aria-label="Close share menu" onClick={() => setShareOpen(false)} />
            <div className="sheet-panel">
              <div className="sheet-handle" />
              <h2>Send your edit</h2>
              <button onClick={() => sharePng("instagram")}><Share2 size={18} /> Share to Instagram</button>
              <button onClick={() => sharePng("tiktok")}><Share2 size={18} /> Share to TikTok</button>
              <button onClick={exportPng}><Download size={18} /> Download PNG</button>
              <button onClick={copyProjectLink}><Link size={18} /> Copy project link</button>
            </div>
          </div>
        )}
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
  onRerollPablo: () => void;
  onIntensity: (value: number) => void;
  onClearPablo: () => void;
  onExport: () => void;
  onShare: () => void;
  onCamera: () => void;
  status: string;
  onProject: (patch: Partial<ProjectState>) => void;
};

function Editor({ template, page, project, previewRef, onPage, onMedia, onText, onApplyPablo, onRerollPablo, onIntensity, onClearPablo, onExport, onShare, onCamera, status, onProject }: EditorProps) {
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
          <button onClick={onCamera} aria-label="Capture media"><Camera size={22} /></button>
          <button onClick={onShare} aria-label="Share export"><Share2 size={22} /></button>
          <button onClick={onExport} aria-label="Download PNG"><Download size={22} /></button>
        </div>
      </div>
      {status && <p className="status-line" role="status">{status}</p>}

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
          <span>export via toolbar</span>
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
          <span>{pabloStyleLabels[pabloEffect?.style ?? "prism-portrait"]}</span>
        </button>
        <div className="pablo-controls">
          <button onClick={onRerollPablo}><RefreshCw size={16} /> Reroll</button>
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
      {(effect.linework ?? []).map((line) => (
        <path
          key={line.id}
          d={line.d}
          fill={line.fill ?? "none"}
          stroke={line.color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={line.width}
          opacity={line.opacity}
        />
      ))}
      {(effect.motifs ?? []).map((motif) => (
        <PabloMotifShape key={motif.id} motif={motif} />
      ))}
    </svg>
  );
}

function PabloMotifShape({ motif }: { motif: PabloMotif }) {
  const transform = `translate(${motif.x} ${motif.y}) rotate(${motif.rotate} ${motif.w / 2} ${motif.h / 2})`;

  if (motif.kind === "eye") {
    return (
      <g transform={transform} opacity={motif.opacity}>
        <path d={`M 0 ${motif.h / 2} Q ${motif.w / 2} -${motif.h * 0.25} ${motif.w} ${motif.h / 2} Q ${motif.w / 2} ${motif.h * 1.25} 0 ${motif.h / 2}`} fill="#f7f2dd" stroke="#050505" strokeWidth="1.1" />
        <ellipse cx={motif.w / 2} cy={motif.h / 2} rx={motif.w * 0.18} ry={motif.h * 0.34} fill={motif.color} stroke="#050505" strokeWidth="0.8" />
        <circle cx={motif.w / 2} cy={motif.h / 2} r={Math.min(motif.w, motif.h) * 0.12} fill="#050505" />
      </g>
    );
  }

  if (motif.kind === "lip") {
    return (
      <g transform={transform} opacity={motif.opacity}>
        <path d={`M 0 ${motif.h * 0.48} C ${motif.w * 0.22} 0 ${motif.w * 0.36} ${motif.h * 0.32} ${motif.w * 0.5} ${motif.h * 0.34} C ${motif.w * 0.65} ${motif.h * 0.32} ${motif.w * 0.78} 0 ${motif.w} ${motif.h * 0.48} C ${motif.w * 0.68} ${motif.h * 1.04} ${motif.w * 0.32} ${motif.h * 1.04} 0 ${motif.h * 0.48}`} fill={motif.color} stroke="#050505" strokeWidth="1" />
        <path d={`M ${motif.w * 0.08} ${motif.h * 0.53} C ${motif.w * 0.35} ${motif.h * 0.7} ${motif.w * 0.65} ${motif.h * 0.7} ${motif.w * 0.92} ${motif.h * 0.53}`} fill="none" stroke="#050505" strokeWidth="0.65" />
      </g>
    );
  }

  if (motif.kind === "profile") {
    return (
      <g transform={transform} opacity={motif.opacity}>
        <path d={`M ${motif.w * 0.1} ${motif.h * 0.08} C ${motif.w * 0.8} ${motif.h * 0.02} ${motif.w} ${motif.h * 0.36} ${motif.w * 0.74} ${motif.h * 0.54} L ${motif.w * 0.94} ${motif.h * 0.68} L ${motif.w * 0.64} ${motif.h * 0.72} C ${motif.w * 0.56} ${motif.h} ${motif.w * 0.2} ${motif.h} ${motif.w * 0.08} ${motif.h * 0.78} Z`} fill={motif.color} stroke="#050505" strokeWidth="1" />
        <path d={`M ${motif.w * 0.36} ${motif.h * 0.34} Q ${motif.w * 0.52} ${motif.h * 0.22} ${motif.w * 0.66} ${motif.h * 0.34}`} fill="none" stroke={motif.accent} strokeWidth="1" />
      </g>
    );
  }

  return (
    <g transform={transform} opacity={motif.opacity}>
      <circle cx={motif.w / 2} cy={motif.h / 2} r={Math.min(motif.w, motif.h) * 0.48} fill={motif.color} stroke="#050505" strokeWidth="1" />
      <path d={`M ${motif.w * 0.28} ${motif.h * 0.2} L ${motif.w * 0.76} ${motif.h * 0.5} L ${motif.w * 0.28} ${motif.h * 0.8} Z`} fill={motif.accent} stroke="#050505" strokeWidth="0.65" />
    </g>
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
  event.target.value = "";
}

function handleCapturedFile(event: ChangeEvent<HTMLInputElement>, onMedia: (file: File) => void) {
  const file = event.target.files?.[0];
  if (file) onMedia(file);
  event.target.value = "";
}
