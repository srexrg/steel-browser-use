"use client";

import { useState } from "react";

interface Listing {
  title: string;
  price: string;
  rating?: string;
  reviews?: string;
  location?: string;
  property_type?: string;
  bedrooms?: string;
}

export default function Home() {
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[] | null>(null);


  const scrapeAirbnb = async () => {
    setScraping(true);
    setError(null);
    setListings(null);
    setSessionUrl(null);

    try {
      const response = await fetch("/api/scrape-airbnb", { method: "POST" });
      if (!response.ok) throw new Error("Failed to start scraping");

      const data = await response.json();
      if (data.sessionViewerUrl) setSessionUrl(data.sessionViewerUrl);
      if (data.sessionId) pollForResults(data.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setScraping(false);
    }
  };

  const pollForResults = async (sessionId: string) => {
    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      try {
        const response = await fetch(`/api/scrape-results?sessionId=${sessionId}`);
        const data = await response.json();

        if (data.success && data.results?.listings?.length > 0) {
          setListings(data.results.listings);
          setScraping(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000);
        } else {
          setScraping(false);
          setError("Results not available");
        }
      } catch (err) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000);
        } else {
          setScraping(false);
          setError("Failed to get results");
        }
      }
    };

    setTimeout(poll, 5000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            Steel Browser
          </h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          <div className="flex gap-4">
            <button
              onClick={scrapeAirbnb}
              disabled={loading || scraping}
              className="px-6 py-3 rounded-lg bg-blue-600 dark:bg-blue-500 text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {scraping ? "Scraping Airbnb..." : "Scrape Airbnb SF"}
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Browser Viewer - Show prominently when session is active */}
          {sessionUrl && (
            <div className="w-full">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                  Live Browser Automation
                </h2>
                {scraping && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600"></div>
                    <span>Automation in progress...</span>
                  </div>
                )}
              </div>
              <div className="w-full h-[calc(100vh-300px)] min-h-[600px] rounded-lg overflow-hidden border-2 border-blue-500 dark:border-blue-400 shadow-xl">
                <iframe
                  src={sessionUrl}
                  className="w-full h-full border-0"
                  allow="clipboard-read; clipboard-write; camera; microphone"
                  title="Steel Browser Session - Watch Automation Live"
                  allowFullScreen
                />
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Watch the AI agent control the browser in real-time
              </p>
        </div>
          )}

          {/* Scraping Results */}
          {listings && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
                Airbnb Listings in San Francisco
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {listings.map((listing, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  >
                    <h3 className="font-semibold text-black dark:text-zinc-50 mb-2">
                      {listing.title}
                    </h3>
                    <p className="text-lg font-medium text-green-600 dark:text-green-400 mb-1">
                      {listing.price}
                    </p>
                    {(listing.rating || listing.reviews) && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                        {listing.rating && `⭐ ${listing.rating}`}
                        {listing.reviews && ` • ${listing.reviews} reviews`}
                      </p>
                    )}
                    {(listing.location || listing.property_type) && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                        {[listing.location, listing.property_type].filter(Boolean).join(" • ")}
                      </p>
                    )}
                    {listing.bedrooms && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {listing.bedrooms}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!sessionUrl && !listings && (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2 text-black dark:text-zinc-50">
                  Steel Browser + Browser Use
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Launch a browser session or scrape Airbnb listings in San Francisco
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
