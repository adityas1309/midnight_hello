# Shadow Run Documentation

Shadow Run is a privacy-native game demo built on Midnight. This documentation set is designed for judges, reviewers, and collaborators who need both a clear product story and a code-accurate technical reference.

## What This Documentation Covers

- system architecture
- mission design and Midnight primitive mapping
- Compact contract behavior
- implementation status and known limitations
- technical Q&A for reviewer conversations

## Current Implementation Snapshot

The current repository contains:

- three Compact contracts:
  - `shadow-runner`
  - `river-crossing`
  - `stone-drop`
- a React + Three.js browser client
- a Node/Express + Socket.IO multiplayer server
- Midnight SDK-based deployment and integration test scripts

## Reading Order

For a fast technical review, read in this order:

1. `implementation-status.md`
2. `architecture.md`
3. `contracts.md`
4. `technical-qna.md`

## Important Reviewer Caveats

Two details should be stated plainly in technical conversations:

1. Ghost Trail and Canopy Split are mission wrappers around transfers plus `shadow-runner.completeMission(...)`; they are not standalone Compact contracts.
2. The most complex witness-heavy continuation flows, especially `river-crossing.cancelOffer` and `stone-drop.claim`, are implemented but not yet stable end-to-end.

This documentation keeps those distinctions explicit so the project can be presented accurately.
