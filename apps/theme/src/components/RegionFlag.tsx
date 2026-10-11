// Original small SVG flag symbols. No remote assets or emoji-font dependency.
export function RegionFlag({ code }: { code: string }) {
  const known = ["JP", "HK", "SG", "US", "CA", "DE"];
  if (!known.includes(code))
    return (
      <span className="region-symbol" aria-hidden="true">
        ◉
      </span>
    );
  const stripes: Record<string, string[]> = {
    DE: ["#202020", "#d62830", "#efbd35"],
  };
  return (
    <svg className="region-flag" viewBox="0 0 24 16" aria-hidden="true">
      <rect width="24" height="16" fill="#fff" />
      {stripes[code]?.map((color, i) => (
        <rect
          key={color}
          y={(i * 16) / 3}
          width="24"
          height={16 / 3}
          fill={color}
        />
      ))}
      {code === "JP" ? <circle cx="12" cy="8" r="4.5" fill="#bc2440" /> : null}
      {code === "SG" ? (
        <>
          <rect width="24" height="8" fill="#df3743" />
          <circle cx="6" cy="4" r="2.5" fill="#fff" />
          <circle cx="7" cy="3.7" r="2.1" fill="#df3743" />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle
              key={i}
              cx={11 + Math.cos((i * Math.PI * 2) / 5) * 1.6}
              cy={4 + Math.sin((i * Math.PI * 2) / 5) * 1.6}
              r=".4"
              fill="#fff"
            />
          ))}
        </>
      ) : null}
      {code === "HK" ? (
        <>
          <rect width="24" height="16" fill="#da3342" />
          {[0, 1, 2, 3, 4].map((i) => (
            <ellipse
              key={i}
              cx="12"
              cy="5.5"
              rx="1.2"
              ry="2.4"
              fill="#fff"
              transform={`rotate(${i * 72} 12 8)`}
            />
          ))}
        </>
      ) : null}
      {code === "US" ? (
        <>
          {Array.from({ length: 7 }, (_, i) => (
            <rect
              key={i}
              y={(i * 16) / 7}
              width="24"
              height={16 / 14}
              fill="#bd3041"
            />
          ))}
          <rect width="10" height="8.6" fill="#304679" />
          {Array.from({ length: 9 }, (_, i) => (
            <circle
              key={i}
              cx={2 + (i % 3) * 3}
              cy={1.7 + Math.floor(i / 3) * 2.5}
              r=".5"
              fill="#fff"
            />
          ))}
        </>
      ) : null}
      {code === "CA" ? (
        <>
          <path
            fill="#d72f42"
            d="M0 0H5V16H0ZM19 0H24V16H19ZM12 2 13.5 5 15 4.2 14.6 7 17 6.4 16.5 8 18 8.5 14 11 14.5 12.5 12.5 12V14H11.5V12L9.5 12.5 10 11 6 8.5 7.5 8 7 6.4 9.4 7 9 4.2 10.5 5Z"
          />
        </>
      ) : null}
    </svg>
  );
}
