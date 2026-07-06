"use client";

import { useState, useCallback } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * usePDFExport — captures a DOM element and generates a dark-mode PDF.
 *
 * Phase 15: "EXPORT BOARD PACK" button captures the entire Right Column
 * (Pricing, Chart, Scenarios, GTM) and generates a clean PDF.
 * Filename: [Project_Name]_Launch_Strategy.pdf
 */
export function usePDFExport() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToPDF = useCallback(async (elementId: string, projectName: string) => {
    setExporting(true);
    setError(null);

    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with id "${elementId}" not found`);
      }

      // Capture the element as canvas with dark background
      const canvas = await html2canvas(element, {
        backgroundColor: "#0A0A0A", // Obsidian dark mode
        scale: 2, // Higher resolution for crisp text
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      // Calculate PDF dimensions (A4 portrait, but we'll use the canvas aspect ratio)
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // If the content is very tall, we'll need multiple pages
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // If content fits on one page, just add it
      if (imgHeight <= pdfHeight) {
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } else {
        // Multi-page: slice the canvas into page-height chunks
        const pageHeightInCanvasPixels = (canvas.width * pdfHeight) / pdfWidth;
        let remainingHeight = canvas.height;
        let position = 0;

        while (remainingHeight > 0) {
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = Math.min(pageHeightInCanvasPixels, remainingHeight);

          const ctx = sliceCanvas.getContext("2d");
          if (!ctx) throw new Error("Could not get canvas context");

          // Fill with dark background
          ctx.fillStyle = "#0A0A0A";
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

          // Draw the slice from the original canvas
          ctx.drawImage(
            canvas,
            0, position, canvas.width, sliceCanvas.height, // source
            0, 0, canvas.width, sliceCanvas.height // dest
          );

          const imgData = sliceCanvas.toDataURL("image/png");
          if (position > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, 0, imgWidth, (sliceCanvas.height * imgWidth) / canvas.width);

          position += sliceCanvas.height;
          remainingHeight -= sliceCanvas.height;
        }
      }

      // Sanitize filename
      const safeName = projectName.replace(/[^a-zA-Z0-9]/g, "_");
      pdf.save(`${safeName}_Launch_Strategy.pdf`);
    } catch (e: any) {
      setError(e.message);
      console.error("PDF export failed:", e);
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportToPDF, exporting, error };
}
