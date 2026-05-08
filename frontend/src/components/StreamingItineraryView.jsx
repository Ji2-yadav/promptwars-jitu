import {
  Accessibility,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Coins,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  MapPinned,
  Navigation,
  Route,
  ShieldAlert,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const googleMapsEmbedApiKey =
  import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY || "";

// Uses Unsplash Source as free photo fallback (no key needed)
function getDestinationPhoto(destination, seed = 0) {
  const queries = [
    `${destination} landmark travel`,
    `${destination} city skyline`,
    `${destination} architecture`,
  ];
  const q = encodeURIComponent(queries[seed % queries.length]);
  // Unsplash Source — free, no key
  return `https://source.unsplash.com/featured/800x400/?${q}`;
}

function getActivityPhoto(activityTitle, destination) {
  const q = encodeURIComponent(`${activityTitle} ${destination}`);
  return `https://source.unsplash.com/featured/400x220/?${q}`;
}

function googleMapsSearchUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function googleMapsDirectionsUrl(destination, place) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${place} ${destination}`,
  )}&travelmode=transit`;
}

function itemMapQuery(item, destination) {
  return (
    item.mapQuery ||
    item.googlePlace?.formattedAddress ||
    `${item.title}, ${destination}`
  );
}

function itemGoogleMapsUrl(item, destination) {
  return (
    item.googlePlace?.googleMapsUri ||
    item.googleMapsUrl ||
    googleMapsSearchUrl(itemMapQuery(item, destination))
  );
}

function buildDayEmbedUrl(day, destination) {
  // Only include stops that have an actual mapped Google Place or explicit mapQuery
  // This prevents abstract activities (like "Orientation loop") from breaking the directions map
  const reliableStops = (day.items || [])
    .filter(
      (item) =>
        item.googlePlace?.placeId ||
        item.googlePlace?.formattedAddress ||
        item.mapQuery,
    )
    .map((item) => {
      if (item.googlePlace?.placeId) {
        return `place_id:${item.googlePlace.placeId}`;
      }
      return item.mapQuery || item.googlePlace?.formattedAddress;
    });

  // If no reliable stops, fallback to the first stop's title or just the destination
  if (reliableStops.length === 0) {
    const firstStopQuery =
      day.items && day.items.length > 0
        ? itemMapQuery(day.items[0], destination)
        : destination;
    return googleMapsEmbedApiKey
      ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(googleMapsEmbedApiKey)}&q=${encodeURIComponent(firstStopQuery)}`
      : `https://www.google.com/maps?q=${encodeURIComponent(firstStopQuery)}&output=embed`;
  }

  if (googleMapsEmbedApiKey && reliableStops.length > 1) {
    const origin = reliableStops[0];
    const destinationStop = reliableStops[reliableStops.length - 1];
    const waypoints = reliableStops.slice(1, -1).slice(0, 8).join("|");
    const waypointParam = waypoints
      ? `&waypoints=${encodeURIComponent(waypoints)}`
      : "";
    return (
      "https://www.google.com/maps/embed/v1/directions" +
      `?key=${encodeURIComponent(googleMapsEmbedApiKey)}` +
      `&origin=${encodeURIComponent(origin)}` +
      `&destination=${encodeURIComponent(destinationStop)}` +
      waypointParam +
      "&mode=transit"
    );
  }

  if (googleMapsEmbedApiKey) {
    return (
      "https://www.google.com/maps/embed/v1/place" +
      `?key=${encodeURIComponent(googleMapsEmbedApiKey)}` +
      `&q=${encodeURIComponent(reliableStops[0])}`
    );
  }

  if (reliableStops.length > 1) {
    const origin = reliableStops[0];
    const destinationStop = reliableStops[reliableStops.length - 1];
    const waypoints = reliableStops.slice(1, -1).slice(0, 8).join("|");
    const waypointParam = waypoints
      ? `&waypoints=${encodeURIComponent(waypoints)}`
      : "";
    return (
      "https://www.google.com/maps/dir/?api=1" +
      `&origin=${encodeURIComponent(origin)}` +
      `&destination=${encodeURIComponent(destinationStop)}` +
      waypointParam +
      "&travelmode=transit&output=embed"
    );
  }

  return `https://www.google.com/maps?q=${encodeURIComponent(reliableStops[0])}&output=embed`;
}

/* ─────────────────────────────────────────
   Streaming Itinerary View
   ──────────────────────────────────────── */

export function StreamingItineraryView({
  itinerary,
  isPlanning,
  trip,
  onReset,
}) {
  const bottomRef = useRef(null);
  const [expandedDays, setExpandedDays] = useState(new Set([0]));
  const [heroLoaded, setHeroLoaded] = useState(false);

  // Auto-expand the latest streaming day
  useEffect(() => {
    if (itinerary?.days?.length) {
      const latestIndex = itinerary.days.length - 1;
      setExpandedDays((prev) => new Set([...prev, latestIndex]));
    }
  }, [itinerary?.days?.length]);

  function toggleDay(index) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  if (!itinerary && !isPlanning) {
    return null; // handled by parent — wizard shown
  }

  const destination =
    itinerary?.summary?.destination || trip?.destination || "your destination";
  const heroUrl = getDestinationPhoto(destination, 0);

  const healthScore = itinerary?.tripHealth?.score ?? null;
  const healthColor =
    healthScore >= 80 ? "#22c55e" : healthScore >= 55 ? "#f59e0b" : "#ef4444";

  return (
    <div className="stream-shell">
      {/* ── Hero Banner ─────────────────────────────── */}
      <div className="stream-hero">
        <div className="stream-hero-img-wrap">
          <img
            className={`stream-hero-img ${heroLoaded ? "stream-hero-img--loaded" : ""}`}
            src={heroUrl}
            alt={`${destination} scenery`}
            onLoad={() => setHeroLoaded(true)}
          />
          <div className="stream-hero-overlay" />
        </div>

        <div className="stream-hero-content">
          <div className="stream-hero-eyebrow">
            <Sparkles size={13} />
            {isPlanning
              ? "Generating your itinerary…"
              : "Your AI-crafted itinerary"}
          </div>
          <h1 className="stream-hero-title">{destination}</h1>
          {itinerary?.summary && (
            <div className="stream-hero-meta">
              <span>
                <Globe size={13} /> {itinerary.summary.tripStyle} pace
              </span>
              {trip?.startDate && (
                <span>
                  <Clock3 size={13} /> {trip.startDate} → {trip.endDate}
                </span>
              )}
              {itinerary.days?.length > 0 && (
                <span>
                  <Route size={13} /> {itinerary.days.length} day
                  {itinerary.days.length !== 1 ? "s" : ""} planned
                </span>
              )}
              {itinerary.googleServices?.placesResolved > 0 && (
                <span>
                  <MapPinned size={13} />{" "}
                  {itinerary.googleServices.placesResolved} Google places
                </span>
              )}
            </div>
          )}

          {healthScore !== null && (
            <div
              className="stream-health-badge"
              style={{ "--health-color": healthColor }}
            >
              <TrendingUp size={14} />
              <strong>{healthScore}</strong>
              <span>Trip Health</span>
            </div>
          )}

          <a
            className="stream-map-link"
            href={googleMapsSearchUrl(destination)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MapPin size={14} />
            Explore in Google Maps
          </a>
        </div>

        <button
          className="stream-hero-reset"
          type="button"
          onClick={onReset}
          title="Start over"
        >
          ← New Trip
        </button>
      </div>

      {/* ── Health Strip ────────────────────────────── */}
      {itinerary?.tripHealth && (
        <div className="stream-health-strip">
          {itinerary.tripHealth.issues?.map((issue) => (
            <span key={issue} className="health-chip health-chip--warn">
              <AlertCircle size={12} />
              {issue}
            </span>
          ))}
          {itinerary.tripHealth.recommendations?.map((rec) => (
            <span key={rec} className="health-chip health-chip--ok">
              <CheckCircle2 size={12} />
              {rec}
            </span>
          ))}
        </div>
      )}

      {/* ── Initial Loading State (before first day) ── */}
      {isPlanning && !itinerary?.days?.length && (
        <div className="stream-init-loader">
          <div className="stream-pulse-ring" />
          <Loader2 className="stream-spin" size={28} />
          <div>
            <strong>TripPilot is composing your itinerary</strong>
            <p>Days will appear here as they're generated…</p>
          </div>
        </div>
      )}

      {/* ── Day Cards ────────────────────────────────── */}
      <div className="stream-days" ref={bottomRef}>
        {itinerary?.days?.map((day, index) => (
          <StreamDayCard
            key={day.day}
            day={day}
            destination={destination}
            isOpen={expandedDays.has(index)}
            isStreaming={isPlanning && index === itinerary.days.length - 1}
            onToggle={() => toggleDay(index)}
          />
        ))}

        {/* Streaming skeleton for next day */}
        {isPlanning && itinerary?.days?.length > 0 && (
          <div className="stream-next-day">
            <Loader2 className="stream-spin" size={16} />
            <span>Generating Day {(itinerary.days.length ?? 0) + 1}…</span>
          </div>
        )}
      </div>

      {/* ── Assumptions & Fallbacks ────────────────── */}
      {!isPlanning && itinerary?.assumptions?.length > 0 && (
        <div className="stream-assumptions">
          <h3>
            <Zap size={15} /> Assumptions & Fallbacks
          </h3>
          <ul>
            {[...itinerary.assumptions, ...(itinerary.fallbacks || [])].map(
              (item) => (
                <li key={item}>{item}</li>
              ),
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Stream Day Card
   ──────────────────────────────────────── */

function StreamDayCard({ day, destination, isOpen, isStreaming, onToggle }) {
  const [imgError, setImgError] = useState(false);
  const photoUrl = getActivityPhoto(day.theme, destination);

  const riskCounts = { low: 0, medium: 0, high: 0 };
  day.items?.forEach((item) => {
    if (item.risk in riskCounts) riskCounts[item.risk]++;
  });
  const worstRisk =
    riskCounts.high > 0 ? "high" : riskCounts.medium > 0 ? "medium" : "low";

  return (
    <article
      className={`sday-card sday-card--risk-${worstRisk} ${isStreaming ? "sday-card--streaming" : ""}`}
    >
      {/* Card header */}
      <button
        className="sday-header"
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        {/* Day thumbnail */}
        {!imgError ? (
          <div className="sday-thumb">
            <img
              src={photoUrl}
              alt={day.theme}
              onError={() => setImgError(true)}
              loading="lazy"
            />
          </div>
        ) : (
          <div className="sday-thumb sday-thumb--fallback">
            <MapPin size={20} />
          </div>
        )}

        <div className="sday-info">
          <div className="sday-badge-row">
            <span className="sday-num">Day {day.day}</span>
            {isStreaming && (
              <span className="sday-live">
                <span className="live-dot" /> Live
              </span>
            )}
            <span className={`sday-risk sday-risk--${worstRisk}`}>
              <ShieldAlert size={11} />
              {worstRisk} risk
            </span>
          </div>
          <strong className="sday-theme">{day.theme}</strong>
          <div className="sday-sub">
            <span>
              <Clock3 size={12} /> {day.items?.length ?? 0} stops
            </span>
            {day.items?.length > 0 && (
              <span>
                <Coins size={12} />{" "}
                {day.items.filter(
                  (i) => i.estimatedCost && i.estimatedCost !== "free",
                ).length > 0
                  ? "Paid activities"
                  : "Mostly free"}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          size={20}
          className={`sday-chevron ${isOpen ? "sday-chevron--open" : ""}`}
        />
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="sday-body">
          <GoogleDayMap day={day} destination={destination} />
          <div className="sday-timeline">
            {day.items?.map((item, i) => (
              <ActivityItem
                key={`${item.time}-${item.title}-${i}`}
                item={item}
                isLast={i === day.items.length - 1}
                destination={destination}
              />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function GoogleDayMap({ day, destination }) {
  const src = buildDayEmbedUrl(day, destination);
  const route = day.googleRoute;
  const totalDistanceKm = route?.totalDistanceMeters
    ? (route.totalDistanceMeters / 1000).toFixed(1)
    : null;

  return (
    <div className="sday-map-panel">
      <div className="sday-map-head">
        <span>
          <MapPinned size={14} />
          Google itinerary map
        </span>
        {route?.totalDurationMinutes && (
          <small>
            <Navigation size={12} />
            {route.totalDurationMinutes} min walk
            {totalDistanceKm ? ` · ${totalDistanceKm} km` : ""}
          </small>
        )}
      </div>
      <iframe
        className="sday-map-frame"
        title={`Google map for ${day.theme}`}
        src={src}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="sday-pin-list">
        {day.items?.map((item, index) => (
          <a
            key={`${item.time}-${item.title}`}
            href={itemGoogleMapsUrl(item, destination)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{index + 1}</span>
            <strong>{item.googlePlace?.displayName || item.title}</strong>
            {item.googlePlace?.rating && (
              <small>{item.googlePlace.rating.toFixed(1)} Google rating</small>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Activity Item
   ──────────────────────────────────────── */

function ActivityItem({ item, isLast, destination }) {
  const [showPhoto, setShowPhoto] = useState(false);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const photoUrl = getActivityPhoto(item.title, destination);

  return (
    <div className={`sact-item ${isLast ? "sact-item--last" : ""}`}>
      {/* Timeline line & dot */}
      <div className="sact-timeline-col">
        <div className={`sact-dot sact-dot--${item.risk}`} />
        {!isLast && <div className="sact-line" />}
      </div>

      {/* Content */}
      <div className="sact-content">
        <div className="sact-time-row">
          <span className="sact-time">
            <Clock3 size={11} />
            {item.time}
          </span>
          <span className={`sact-risk-badge sact-risk-badge--${item.risk}`}>
            <ShieldAlert size={10} />
            {item.risk}
          </span>
          <button
            className="sact-photo-toggle"
            type="button"
            onClick={() => setShowPhoto((p) => !p)}
            title={showPhoto ? "Hide photo" : "Show photo"}
            aria-label={
              showPhoto
                ? `Hide photo for ${item.title}`
                : `Show photo for ${item.title}`
            }
            aria-pressed={showPhoto}
          >
            <Star size={11} />
          </button>
        </div>

        <strong className="sact-title">{item.title}</strong>
        <p className="sact-why">{item.why}</p>

        {/* Photo (lazy toggled) */}
        {showPhoto && (
          <div className="sact-photo-wrap">
            <img
              className={`sact-photo ${photoLoaded ? "sact-photo--loaded" : ""}`}
              src={photoUrl}
              alt={item.title}
              onLoad={() => setPhotoLoaded(true)}
              loading="lazy"
            />
            {!photoLoaded && <div className="sact-photo-skeleton" />}
            <a
              className="sact-photo-attr"
              href={`https://unsplash.com/s/photos/${encodeURIComponent(item.title)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Photo via Unsplash <ExternalLink size={10} />
            </a>
          </div>
        )}

        <div className="sact-meta">
          <span>
            <MapPin size={11} /> {item.type}
          </span>
          <span>
            <Clock3 size={11} /> {item.durationMinutes} min
          </span>
          <span>
            <Coins size={11} /> {item.estimatedCost}
          </span>
          <a
            href={itemGoogleMapsUrl(item, destination)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MapPin size={11} /> Maps
          </a>
          <a
            href={googleMapsDirectionsUrl(destination, item.title)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Route size={11} /> Transit
          </a>
          {item.googlePlace?.rating && (
            <span>
              <Star size={11} /> {item.googlePlace.rating.toFixed(1)}
            </span>
          )}
        </div>

        {item.accessibilityNotes && (
          <p className="sact-access">
            <Accessibility size={12} />
            {item.accessibilityNotes}
          </p>
        )}
      </div>
    </div>
  );
}
