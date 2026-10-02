let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" }
];


// 1. Search notes
function searchNotes(word) {
  return notes.filter(note =>
    note.text.toLowerCase().includes(word.toLowerCase())
  );
}

console.log(searchNotes("day"));
// Expected: [{ id: 2, text: "Finish the Day 3 assignment", category: "study" }]

console.log(searchNotes("holiday"));
// Expected: []


// 2. Find the longest note
function longestNote() {
  if (notes.length === 0) {
    return null;
  }

  let longest = notes[0];

  for (let note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }

  return longest;
}

console.log(longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

let savedNotes = notes;
notes = [];

console.log(longestNote());
// Expected: null

notes = savedNotes;


// 3. Count notes by category
function countByCategory() {
  let counts = {};

  for (let note of notes) {
    if (counts[note.category]) {
      counts[note.category]++;
    } else {
      counts[note.category] = 1;
    }
  }

  return counts;
}

console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }

notes = [];

console.log(countByCategory());
// Expected: {}

notes = savedNotes;


// 4. Get summary
function getSummary() {
  let counts = countByCategory();

  let word = notes.length === 1 ? "note" : "notes";

  return `${notes.length} ${word}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}

console.log(getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study."

notes = [
  { id: 1, text: "Test note", category: "personal" }
];

console.log(getSummary());
// Expected: "1 note: 1 personal, 0 work, 0 study."

notes = savedNotes;


// 5. Check for duplicate
function isDuplicate(text) {
  let cleanedText = text.trim().replace(/\s+/g, " ").toLowerCase();

  return notes.some(note =>
    note.text.trim().replace(/\s+/g, " ").toLowerCase() === cleanedText
  );
}

console.log(isDuplicate("Call mum"));
// Expected: true

console.log(isDuplicate("  CALL   MUM  "));
// Expected: true


// 6. Add a new note
function addNote(text, category) {
  let cleanedText = text.trim();

  if (cleanedText.length < 1 || cleanedText.length > 200) {
    console.log("Note was not added: text must be 1–200 characters.");
    return false;
  }

  if (!["personal", "work", "study"].includes(category)) {
    console.log("Note was not added: invalid category.");
    return false;
  }

  if (isDuplicate(cleanedText)) {
    console.log("Note was not added: duplicate note.");
    return false;
  }

  let newId = notes.length > 0
    ? Math.max(...notes.map(note => note.id)) + 1
    : 1;

  notes.push({
    id: newId,
    text: cleanedText,
    category: category
  });

  console.log("Note added successfully.");
  return true;
}

console.log(addNote("Prepare for the JavaScript test", "study"));
// Expected: true

console.log(addNote("  BUY   MILK   AND   BREAD  ", "personal"));
// Expected: false

console.log(addNote("Go for a walk", "health"));
// Expected: false

console.log(addNote("", "personal"));
// Expected: false




