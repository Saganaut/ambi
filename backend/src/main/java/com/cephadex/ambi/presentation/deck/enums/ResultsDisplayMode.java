package com.cephadex.ambi.presentation.deck.enums;

public enum ResultsDisplayMode  {
    IMMEDIATE, // Results are displayed as they come in
    ROUND_END, // Results are hidden until the user answers (or the question times out)
    PRESENTATION_END, // Only show the results when all rounds are complete
    MANUAL, // Results are hidden until the presenter clicks "Show results"
    AFTER_FOLLOWUP, // Results are hidden until the presenter clicks "Show results" or the follow-up question times.
    NEVER // Results are never shown (for example, for a purely informational slide 

}