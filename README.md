Cleaning-OS (Angular Dashboard)

A production-style booking management dashboard built with Angular Signals and RxJS, focusing on real-world state management patterns.

Features

Signal-based store (no NgRx)

Server + local state merge

Filtering by status

Sorting (When / Total, ASC/DESC)

Pagination with page size selector

Showing X–Y of Z range

Persisted UI state across refresh

Live search (name + address)

Optimistic delete with undo

Server failure rollback (mocked API)

Tech Stack

Angular (standalone, signals)

RxJS (side effects)

TypeScript

Mock API service

Architecture
features/bookings
  data-access   → store, side effects
  pages         → route-level UI
  ui            → dumb components

core
  api           → backend adapters
  models        → domain types

Data Flow

UI → Store (signals) → API (RxJS) → Store updates → UI reacts

All filtering, sorting, pagination, and search are computed in the store.

Why this project?

To practice building resilient, scalable UI state the way real production dashboards are built.