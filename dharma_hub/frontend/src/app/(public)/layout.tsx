import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FestivalAtmosphere from "@/components/FestivalAtmosphere";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <FestivalAtmosphere />
      <Navbar />
      <main id="main-content" className="flex-grow" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
