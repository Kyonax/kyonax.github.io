// kitchen-sink-lexer.js — an include target for the "Everything org2html Renders" post.
// The post splices in a slice of this file with :lines, so only part of it reaches the page.
export function lexLine(line) {
  const heading = line.match(/^(\*+)\s+(.*)$/)
  if (heading) return { type: "heading", level: heading[1].length, title: heading[2] }
  if (line.trim() === "") return { type: "blank" }
  return { type: "text", value: line }
}

// Below the slice: nothing from here down reaches the page.
export const lexDocument = (source) => source.split("\n").map(lexLine)
