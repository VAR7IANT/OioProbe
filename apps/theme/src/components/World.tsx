import { useMemo, useRef, useState } from "react";
import {
  geoDistance,
  geoGraticule10,
  geoNaturalEarth1,
  geoOrthographic,
  geoPath,
} from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import atlas from "world-atlas/land-110m.json";
import type { NodeInfo } from "@oioprobe/komari-client";
import {
  Globe2,
  Map,
  Minus,
  Plus,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "./ui/button";
import { RegionFlag } from "./RegionFlag";

const land = feature(
  atlas as unknown as Topology,
  atlas.objects.land as GeometryCollection,
);
// Region reference locations only. No IP geolocation or precise node coordinates.
const locations: Record<string, [number, number]> = {
  JP: [138, 37],
  HK: [114.17, 22.32],
  SG: [103.82, 1.35],
  US: [-98, 38],
  CA: [-106, 56],
  DE: [10, 51],
  GB: [-2, 54],
  FR: [2, 47],
  NL: [5, 52],
  CN: [104, 35],
  TW: [121, 24],
  KR: [128, 36],
  IN: [79, 22],
  AU: [134, -25],
  BR: [-53, -10],
  RU: [100, 60],
  FI: [26, 64],
  SE: [16, 62],
  CH: [8, 47],
};
function regionName(code: string) {
  try {
    return (
      new Intl.DisplayNames(["zh-CN"], { type: "region" }).of(code) || code
    );
  } catch {
    return code;
  }
}
export function World({
  nodes,
  selected,
  onSelect,
}: {
  nodes: NodeInfo[];
  selected: string;
  onSelect: (code: string) => void;
}) {
  const [globe, setGlobe] = useState(false),
    [collapsed, setCollapsed] = useState(false);
  const [zoom, setZoom] = useState(1),
    [rotation, setRotation] = useState<[number, number]>([-105, -20]);
  const drag = useRef<{
    x: number;
    y: number;
    rotation: [number, number];
  } | null>(null);
  const counts = useMemo(
    () =>
      [...new Set(nodes.map((n) => n.region).filter(Boolean))].map((code) => ({
        code,
        count: nodes.filter((n) => n.region === code).length,
      })),
    [nodes],
  );
  const projection = globe
    ? geoOrthographic()
        .rotate(rotation)
        .scale(164 * zoom)
        .translate([500, 185])
    : geoNaturalEarth1()
        .scale(155 * zoom)
        .translate([500, 190]);
  const path = geoPath(projection);
  const select = (code: string) => {
    onSelect(selected === code ? "" : code);
    if (globe && locations[code])
      setRotation([-locations[code][0], -locations[code][1]]);
  };
  return (
    <section className="panel geography-panel" aria-label="地区分布">
      <div className="panel-heading">
        <h2>
          <Globe2 size={16} />
          地区分布{" "}
          <span className="geography-count">
            {counts.length} 个地区 · {nodes.length} 个节点
          </span>
        </h2>
        <div className="map-actions">
          <Button
            variant="ghost"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            {collapsed ? "展开地图" : "收起地图"}
          </Button>
        </div>
      </div>
      <div className={`map-stage ${collapsed ? "collapsed" : ""}`}>
        <div className="region-chips" role="group" aria-label="地区筛选">
          <button
            className={!selected ? "selected" : ""}
            aria-pressed={!selected}
            onClick={() => onSelect("")}
          >
            <span className="region-all" aria-hidden="true">
              <Globe2 size={13} />
            </span>
            <span className="region-name">全部地区</span>
            <b>{nodes.length}</b>
          </button>
          {counts.map(({ code, count }) => (
            <button
              key={code}
              className={selected === code ? "selected" : ""}
              aria-label={`筛选${regionName(code)}节点`}
              aria-pressed={selected === code}
              onClick={() => select(code)}
            >
              <span aria-hidden="true">
                <RegionFlag code={code} />
              </span>
              <span className="region-name">
                {code}
                <span className="region-full">{regionName(code)}</span>
              </span>
              <b>{count}</b>
            </button>
          ))}
        </div>
        {!collapsed && (
          <div className="map-body">
            <div className={`geo-canvas ${globe ? "globe" : "flat"}`}>
              <svg
                viewBox="0 0 1000 370"
                role="img"
                aria-label={globe ? "全球节点球面投影地图" : "全球节点地理地图"}
                onPointerDown={(e) => {
                  if (globe) {
                    drag.current = { x: e.clientX, y: e.clientY, rotation };
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }
                }}
                onPointerMove={(e) => {
                  const d = drag.current;
                  if (d)
                    setRotation([
                      d.rotation[0] + (e.clientX - d.x) * 0.4,
                      Math.max(
                        -80,
                        Math.min(80, d.rotation[1] - (e.clientY - d.y) * 0.3),
                      ),
                    ]);
                }}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
              >
                <defs>
                  <pattern
                    id="atlas-dots"
                    width="4"
                    height="4"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle cx="2" cy="2" r="0.9" fill="var(--map-dot)" />
                  </pattern>
                </defs>
                <path
                  className="geo-ocean"
                  d={path({ type: "Sphere" }) || ""}
                />
                <path className="geo-grid" d={path(geoGraticule10()) || ""} />
                <path className="geo-land" d={path(land) || ""} />
                <path
                  className="geo-texture"
                  d={path(land) || ""}
                  fill="url(#atlas-dots)"
                />
              </svg>
              {counts.map(({ code, count }) => {
                const coords = locations[code];
                if (
                  !coords ||
                  (globe &&
                    geoDistance(coords, [-rotation[0], -rotation[1]]) >
                      Math.PI / 2)
                )
                  return null;
                const point = projection(coords);
                if (
                  !point ||
                  point[0] < 0 ||
                  point[0] > 1000 ||
                  point[1] < 0 ||
                  point[1] > 370
                )
                  return null;
                return (
                  <button
                    key={code}
                    className={`geo-pin ${selected === code ? "selected" : ""}`}
                    style={{
                      left: `${point[0] / 10}%`,
                      top: `${point[1] / 3.7}%`,
                    }}
                    aria-label={`地图筛选${regionName(code)}节点`}
                    aria-pressed={selected === code}
                    onClick={() => select(code)}
                  >
                    <span className="pin-dot" />
                    <span className="pin-label">
                      {code} <b>{count}</b>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="map-footer">
              <span>地区参考位置 · 非节点精确坐标</span>
              <div className="map-controls">
                <Button
                  variant="outline"
                  aria-label={globe ? "切换 2D 地图" : "切换 3D 地球"}
                  onClick={() => {
                    setGlobe(!globe);
                    setZoom(1);
                  }}
                >
                  {globe ? <Map size={14} /> : <Globe2 size={14} />}
                  {globe ? "2D 地图" : "3D 地球"}
                </Button>
                {globe ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="向左旋转地球"
                      onClick={() => setRotation((r) => [r[0] - 20, r[1]])}
                    >
                      <ArrowLeft size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="向右旋转地球"
                      onClick={() => setRotation((r) => [r[0] + 20, r[1]])}
                    >
                      <ArrowRight size={14} />
                    </Button>
                  </>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="缩小地图"
                  disabled={zoom <= 1}
                  onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
                >
                  <Minus size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="放大地图"
                  disabled={zoom >= 2}
                  onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
                >
                  <Plus size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="重置地图视角"
                  onClick={() => {
                    setZoom(1);
                    setRotation([-105, -20]);
                  }}
                >
                  <RotateCcw size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
