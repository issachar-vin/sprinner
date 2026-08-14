# Sprinner

## Goal:

create a web app in react that facilitates the needs to plan a print.

## AC:

- It should create columns for X number of sprints.
- create ticket cards (essentially representing an issue in jira) that we can place on the board.
- each ticket should have its own row.
- we should be able to drag and drop the tickets inbetween columns (sprints).
- we should be able to stretch a ticket across multiple sprint columns (showing a ticket will need to be worked on over multiple sprints).
- Saves state in browser memory/cache
- should be able to export data into a json file
- should be able to import data from a json file

## Future goals

- Connects to jira instance by giving it a PAT and a base URL
- Should be able to fetch all issues in an epic and load them into memory
- Does not save anything back to jira, only reads

## Components

### Ticket

- Should the follows information displayed
  - Ticket ID
  - Ticket Title
  - Points
  - Assignee
  - Blocked By
- Should have a pencil icon
  - Clicking the pencil should open a Ticket Edit Right Side Panel
- Should have a delete icon with a confirmation modal
- should have a X icon to send it back to the ticket list

### Ticket Edit Side panel

- Shows all the fields on a ticket for editting

### Ticket list

- A side panel on the left that has all the ticket cards for grabbing.
- Tickets grabbed from this list should be removed on the list since it will be on the sprint board now.

### Sprint Board

- Can be set to have X number of columns
- Each column should have a header
- Each column should have this information to display:
  - Sprint #
  - Sprint Date Range
  - Number of points so far from this sprint
    - Adds up all tickets points that touch this sprint
  - Should be able to track:
    - Holidays in that sprint range
    - PTO in that sprint range
- Tickets should be able to be placed on the board
- Tickets should be able to drag and drop with snapping
- Each ticket should be on its own row
- Should have a pencil icon that opens a side panel for editing all fields in the sprint including pto and holiday tracking

### Sprint Edit Side Panel

- Should be able to edit all fields on a sprint
- should have a delete button with a confirmation modal
- should have a time off section with nothing and with a add new time off
- Should show a modal :
  - with a holiday or pto selection
  - a start date
  - an optional end date
  - and a label
