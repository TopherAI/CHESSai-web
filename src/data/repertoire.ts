// src/data/repertoire.ts
// CHESSai — Opening Blueprint repertoire lines. Extracted from App.tsx so
// Autopsy's doctrine checker can import the canonical 9-move cage without
// duplicating it (a second hardcoded copy would be exactly the kind of
// drift this app has already been bitten by once).

export type RepertoireLine = {
  id: string;
  name: string;
  description: string;
  theory?: string;
  moves: string[];
  attempts?: number;
  perfectSessions?: number;
  coverImage?: string;
  startFen?: string;
  playerColor?: 'white' | 'black';
};

export const repertoire: RepertoireLine[] = [
  {
    id: 'mirror-italian',
    name: 'ITALIAN',
    description: 'Pianissimo',
    theory: `**Core Philosophy:** Cage complete at move 9. Build the cage, complete the route, choose Nf5 if available, otherwise stabilize and improve.

### BASE RULE
After Nbd2 -> Nf1 -> Ng3:
IF Nf5 is safe -> play **Nf5**
ELSE -> play **Be3** (stabilize + improve)`,
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'a4', 'a5', 'O-O', 'O-O', 'h3', 'h6', 'Re1'],
    attempts: 73,
    perfectSessions: 104
  },
  {
    id: 'mirror-italian-black',
    name: 'ITALIAN',
    description: 'TWO KNIGHTS',
    playerColor: 'black',
    theory: `**Core Philosophy:** Cage complete at move 9. Build the cage, complete the route, choose Nf5 if available, otherwise stabilize and improve.

### BASE RULE
After Nbd2 -> Nf1 -> Ng3:
IF Nf5 is safe -> play **Nf5**
ELSE -> play **Be3** (stabilize + improve)`,
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'a4', 'a5', 'O-O', 'O-O', 'h3', 'h6', 'Re1', 'Re8'],
    attempts: 0,
    perfectSessions: 0
  },
  {
    id: 'duras-control',
    name: 'DURAS',
    description: '4 Knights',
    theory: `**Core Philosophy:** Cage complete at move 9. Build the cage, complete the route, choose Nf5 if available, otherwise stabilize and improve.

### BASE RULE
After Nbd2 -> Nf1 -> Ng3:
IF Nf5 is safe -> play **Nf5**
ELSE -> play **Be3** (stabilize + improve)`,
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Be7', 'c3', 'O-O', 'O-O', 'd6', 'Re1', 'a6', 'Nbd2', 'h6', 'a4', 'Re8', 'Nf1', 'Bf8', 'Ng3'],
    attempts: 45,
    perfectSessions: 47
  },
  {
    id: 'four-knights',
    name: 'FOUR KNIGHTS',
    description: 'd3 Cage',
    theory: `**Core Philosophy:** Same Cage. One pivot. Same route. Same finish.

### BASE RULE
After Nbd2 -> Nf1 -> Ng3:
IF Nf5 is safe -> play **Nf5**
ELSE -> play **Be3**`,
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'd6', 'c3', 'Be7', 'a4', 'O-O', 'O-O', 'a6', 'h3', 'h6', 'Re1', 'Re8'],
    attempts: 70,
    perfectSessions: 100
  },
  {
    id: 'petrov',
    name: 'PETROV',
    description: 'Refusal Cage',
    theory: `**Core Philosophy:** Cage complete at move 9. Extra central control; Black’s knight retreat keeps it quiet.

### TRIGGERS (RULE ENGINE)
- **NF5_TRIGGER:** IF knight reaches f5 in <=2 moves AND no tactic refutes THEN execute Nf1 -> Ng3 -> Nf5
- **D4_TRIGGER:** IF center is loose AND activity improves immediately AND knight tour survives THEN play d4 ELSE reject
- **ATTACK_TRIGGER:** IF king is castled AND you have Ng3/Nf5 + queen access THEN launch Ng5 / Qg4 / Re3-g3
- **PROPHYLAXIS_TRIGGER:** IF ...b5 -> a4; IF ...Bg4 -> h3; ELSE do not play.`,
    moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Bc4', 'Nxe4', 'd3', 'Nc5', 'c3', 'd6', 'a4', 'a5', 'O-O', 'Be7', 'h3', 'O-O', 'Re1'],
    attempts: 45,
    perfectSessions: 100
  },
  {
    id: 'sicilian',
    name: 'SICILIAN',
    description: 'Bowdler Cage',
    theory: `**Core Philosophy:** Cage complete at move 9. a4 completely kills …b5 dreams. Classic slow Italian vs Sicilian.

### TRIGGERS (RULE ENGINE)
- **NF5_TRIGGER:** IF knight reaches f5 in <=2 moves AND no tactic refutes THEN execute Nf1 -> Ng3 -> Nf5
- **D4_TRIGGER:** IF center is loose AND activity improves immediately AND knight tour survives THEN play d4 ELSE reject
- **ATTACK_TRIGGER:** IF king is castled AND you have Ng3/Nf5 + queen access THEN launch Ng5 / Qg4 / Re3-g3
- **PROPHYLAXIS_TRIGGER:** IF ...b5 -> a4; IF ...Bg4 -> h3; ELSE do not play.`,
    moves: ['e4', 'c5', 'Nf3', 'Nc6', 'Bc4', 'e6', 'c3', 'd6', 'd3', 'Nf6', 'a4', 'Be7', 'O-O', 'O-O', 'h3', 'a6', 'Re1'],
    attempts: 40,
    perfectSessions: 100
  },
  {
    id: 'caro-kann',
    name: 'AUSTRIAN',
    description: 'Hillbilly Cage OR 2 Knights',
    theory: `**Core Philosophy:** Cage complete at move 9 (after early Bb3 retreat). Light-square bishop stays active; structure identical to main Cage.

### TRIGGERS (RULE ENGINE)
- **NF5_TRIGGER:** IF knight reaches f5 in <=2 moves AND no tactic refutes THEN execute Nf1 -> Ng3 -> Nf5
- **D4_TRIGGER:** IF center is loose AND activity improves immediately AND knight tour survives THEN play d4 ELSE reject
- **ATTACK_TRIGGER:** IF king is castled AND you have Ng3/Nf5 + queen access THEN launch Ng5 / Qg4 / Re3-g3
- **PROPHYLAXIS_TRIGGER:** IF ...b5 -> a4; IF ...Bg4 -> h3; ELSE do not play.`,
    moves: ['e4', 'c6', 'Bc4', 'd5', 'Bb3', 'Nf6', 'Nf3', 'e6', 'c3', 'Be7', 'd3', 'O-O', 'a4', 'a5', 'O-O', 'Nbd7', 'h3', 'Re8', 'Re1', 'b6', 'Nbd2', 'Bb7', 'Nf1', 'c5'],
    attempts: 35,
    perfectSessions: 35
  },
  {
    id: 'french',
    name: 'FRENCH',
    description: '2 Knights or Advanced French',
    theory: `**Core Philosophy:** Cage complete at move 9. Closed center keeps it extremely quiet — exactly the slow squeeze you want.

### TRIGGERS (RULE ENGINE)
- **NF5_TRIGGER:** IF knight reaches f5 in <=2 moves AND no tactic refutes THEN execute Nf1 -> Ng3 -> Nf5
- **D4_TRIGGER:** IF center is loose AND activity improves immediately AND knight tour survives THEN play d4 ELSE reject
- **ATTACK_TRIGGER:** IF king is castled AND you have Ng3/Nf5 + queen access THEN launch Ng5 / Qg4 / Re3-g3
- **PROPHYLAXIS_TRIGGER:** IF ...b5 -> a4; IF ...Bg4 -> h3; ELSE do not play.`,
    moves: ['e4', 'e6', 'Nf3', 'd5', 'Bc4', 'Nf6', 'd3', 'c5', 'c3', 'Nc6', 'a4', 'Be7', 'O-O', 'O-O', 'h3', 'b6', 'Re1', 'Bb7', 'Nbd2', 'Qc7', 'Nf1', 'Rad8', 'Be3', 'd4'],
    attempts: 30,
    perfectSessions: 30
  },
  {
    id: 'scandinavian',
    name: 'SCANDINAVIAN',
    description: 'Scandi',
    theory: `**Core Philosophy:** Cage complete at move 9. Early queen retreat lets you build the full structure with zero drama.

### TRIGGERS (RULE ENGINE)
- **NF5_TRIGGER:** IF knight reaches f5 in <=2 moves AND no tactic refutes THEN execute Nf1 -> Ng3 -> Nf5
- **D4_TRIGGER:** IF center is loose AND activity improves immediately AND knight tour survives THEN play d4 ELSE reject
- **ATTACK_TRIGGER:** IF king is castled AND you have Ng3/Nf5 + queen access THEN launch Ng5 / Qg4 / Re3-g3
- **PROPHYLAXIS_TRIGGER:** IF ...b5 -> a4; IF ...Bg4 -> h3; ELSE do not play.`,
    moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nf3', 'Nc6', 'Bc4', 'Qd8', 'c3', 'Nf6', 'd3', 'Bg4', 'h3', 'Bh5', 'a4', 'e6', 'O-O', 'Be7', 'Re1', 'O-O', 'Nbd2', 'Qc7', 'Nf1'],
    attempts: 25,
    perfectSessions: 25
  },
  {
    id: 'na5-punish',
    name: 'NA5 PUNISH',
    description: 'Real game — won by checkmate',
    theory: `**Real game:** TopherBettis vs arexniba84, Chess.com daily, 2026-07-02 — won by checkmate (chess.com/game/daily/994047672).

**Core Idea:** 3...Na5 attacks the bishop but ignores development and the center. 4.Bxf7+! sacs the bishop to drag the king out — 4...Kxf7 5.Nxe5+ forks the king and wins the e5 pawn with check. If Black plays passively instead of blocking with ...Nf6, 6.Qf3 (threatening Qxf7#/Qf7#) followed by 7.Qf7# delivers mate.`,
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Na5', 'Bxf7+', 'Kxf7', 'Nxe5+', 'Ke8', 'Qf3', 'd6', 'Qf7#'],
    attempts: 0,
    perfectSessions: 0
  },
  {
    id: 'topher-gambit',
    name: 'TOPHER GAMBIT',
    description: 'Opening Lab — King Extraction Sac (ECO C50)',
    theory: `**Italian Game (ECO C50) — Topher Gambit: king extraction via Bxf7+.** Discovered and played by TopherBettis vs arexniba84, Chess.com daily, 2026-07-02 — won by checkmate (chess.com/game/daily/994047672). Core pattern: 4.Bxf7+ Kxf7 5.Nxe5+ … Qf3 Qf7#.

**Core Idea:** 3...Na5 attacks the bishop but abandons development and, critically, pulls Black's only knight off c6 — so after 5.Nxe5+ there is no ...Nxe5 recapture available (unlike the classical 3...Bc5 Jerome Gambit this pattern is related to). Black's correct defense is 5...Nf6!, blocking the f-file before White's queen arrives. If Black plays passively instead (5...Ke8 6.Qf3 d6), 7.Qf7# is checkmate — f7 is guarded by the e5 knight, so the king cannot recapture.

**Classification:** Tactical theme: king extraction. Attack pattern: queen infiltration. Conversion: checkmate / winning attack. Key concepts: f7 weakness, forcing moves, initiative, exposed king, tempo, mating attack.

**CHESSai Metadata:** Category: Opening Lab. Pattern Type: Opening Sacrifice. Difficulty: Intermediate. Prerequisites: Italian Game fundamentals, tactical calculation.`,
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Na5', 'Bxf7+', 'Kxf7', 'Nxe5+', 'Ke8', 'Qf3', 'd6', 'Qf7#'],
    attempts: 0,
    perfectSessions: 0
  },
  {
    id: 'jerome-gambit',
    name: 'JEROME GAMBIT',
    description: 'Opening Lab — Deflection & Rook Grab (ECO C50)',
    theory: `**Italian Game (ECO C50) — Jerome Gambit rook grab.** Same 3...Na5 setup as the Topher Gambit (Black attacks the bishop and abandons the center), but diverges at move 6. Core pattern: 4.Bxf7+ Kxf7 5.Nxe5+ Ke8 6.Qh5 threatens 7.Qxf7# (guarded by the e5 knight).

**Core Idea:** Black's natural try 6...g6 blocks the h5–f7 diagonal and attacks the queen, but 7.Nxg6! is a deflection sacrifice — 7...hxg6 recaptures but opens the h-file completely, and 8.Qxh8 wins the rook. Compare with the Topher Gambit, which reaches the same position after 5...Ke8 but finishes 6.Qf3 d6 7.Qf7# — immediate mate instead of this material-grabbing line.

**Classification:** Tactical theme: deflection / king extraction. Attack pattern: queen infiltration via the open h-file. Conversion: material win (the exchange), not immediate mate. Key concepts: f7 weakness, diagonal control, a pawn-lever defense (g6) backfiring, deflection sacrifice, open-file exploitation.

**CHESSai Metadata:** Category: Opening Lab. Pattern Type: Opening Sacrifice. Difficulty: Intermediate. Prerequisites: Italian Game fundamentals, tactical calculation.`,
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Na5', 'Bxf7+', 'Kxf7', 'Nxe5+', 'Ke8', 'Qh5', 'g6', 'Nxg6', 'hxg6', 'Qxh8'],
    attempts: 0,
    perfectSessions: 0
  },

  {
    "id": "payload-ch-1",
    "name": "TRAP: Two Knights Root",
    "description": "Learn position",
    "playerColor": "black",
    "startFen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "theory": "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 { Two Knights Defense. Black develops actively. White's Bc4 targets f7. Black's Nf6 counter-attacks e4. The aggressive alternative to the Giuoco Piano. } *",
    "moves": [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Nf6"
    ],
    "attempts": 0,
    "perfectSessions": 0
  },
  {
    "id": "payload-ch-2",
    "name": "TRAP: 4.Ng5 Threat Recognition",
    "description": "DRILL: high priority",
    "playerColor": "black",
    "startFen": "r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    "theory": "1. Ng5 d5! { CRITICAL DRILL. Ng5 attacks f7 — guarded only by the king. Bc4 + Ng5 = double pressure. 4...d5 is the ONLY principled response. Counter in the center immediately. Do not defend — attack. } 2. exd5 *",
    "moves": [
      "Ng5",
      "d5!",
      "exd5"
    ],
    "attempts": 0,
    "perfectSessions": 0
  },
  {
    "id": "payload-ch-3",
    "name": "TRAP: Classical Defense: 5...Na5",
    "description": "DRILL: medium priority",
    "playerColor": "black",
    "startFen": "r1bqkb1r/ppp2ppp/2n2n2/3pp1N1/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 0 5",
    "theory": "1... Na5! { Classical — avoids Fried Liver entirely. Attacks Bc4 directly. Forces White to handle bishop before f7. Safe, sound, principled. No king exposure. } 2. Bb5+ c6 3. dxc6 bxc6 4. Be2 { White returns the pawn, reaches clean solid position. Black gets two bishops. White gets safety and easy development. Black plan: castle, develop, fight for center with ...d5 later. } *",
    "moves": [
      "Na5!",
      "Bb5+",
      "c6",
      "dxc6",
      "bxc6",
      "Be2"
    ],
    "attempts": 0,
    "perfectSessions": 0
  },
  {
    "id": "payload-ch-4",
    "name": "TRAP: Fried Liver Invitation: 5...Nxd5",
    "description": "DRILL: high priority",
    "playerColor": "black",
    "startFen": "r1bqkb1r/ppp2ppp/2n2n2/3pp1N1/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 0 5",
    "theory": "1... Nxd5 { Training path — invites the Fried Liver to learn the defense cold. Black recaptures and dares White to sac on f7. 5...Na5 is safer. 5...Nxd5 is the drill path. DANGER: Without knowing 7...Ke6, White's attack is crushing. Know the defense first. } 2. Nxf7 *",
    "moves": [
      "Nxd5",
      "Nxf7"
    ],
    "attempts": 0,
    "perfectSessions": 0
  },
  {
    "id": "payload-ch-5",
    "name": "TRAP: Fried Liver Defense: 7...Ke6!",
    "description": "DRILL: critical priority",
    "playerColor": "black",
    "startFen": "r1bq1b1r/ppp2kpp/2n5/3np3/2B5/5Q2/PPPP1PPP/RNB1K2R b KQ - 1 7",
    "theory": "1... Ke6! { THE CRITICAL MOVE. King goes FORWARD. Counter-intuitive — and correct. Ke6 controls d5 and f5, protecting the Nd5. 7...Ke8 = passive, White dominates. 7...Kg8 = 8.Qxd5+ takes Nd5 for free. Collapse. 7...Kf6 = 8.Qd3 king is stranded. DRILL: Play Ke6 INSTANTLY. 10 reps. Must be automatic. } *",
    "moves": [
      "Ke6!"
    ],
    "attempts": 0,
    "perfectSessions": 0
  },
  {
    "id": "payload-ch-6",
    "name": "TRAP: Main Stabilizer: 8...Ne7",
    "description": "DRILL: high priority",
    "playerColor": "black",
    "startFen": "r1bq1b1r/ppp3pp/2n1k3/3np3/2B5/2N2Q2/PPPP1PPP/R1B1K2R b KQ - 3 8",
    "theory": "1... Ne7 { Safest stabilizer. Nd5 retreats to e7 — covers d5 square, unblocks Nc6 to reorganize. Follow-up plan: ...c6 to defend, develop Bc8, castle queenside. DANGER if missed: Nd5 left on d5 under Nc3 pressure — no good square available. } *",
    "moves": [
      "Ne7"
    ],
    "attempts": 0,
    "perfectSessions": 0
  },
  {
    "id": "payload-ch-7",
    "name": "TRAP: Sharp Stabilizer: 8...Ncb4",
    "description": "DRILL: medium priority",
    "playerColor": "black",
    "startFen": "r1bq1b1r/ppp3pp/2n1k3/3np3/2B5/2N2Q2/PPPP1PPP/R1B1K2R b KQ - 3 8",
    "theory": "1... Ncb4! { Sharp alternative — attacks c2, threatens ...Nd3+. Real sting. Riskier than 8...Ne7 but has serious counter-attacking punch. DANGER if missed: Passive play lets White consolidate. Ncb4 is the fighting choice. Follow-up: If White isn't precise, ...Nd3+ wins material or creates havoc on c2. } *",
    "moves": [
      "Ncb4!"
    ],
    "attempts": 0,
    "perfectSessions": 0
  },
  {
    "id": "payload-ch-8",
    "name": "TRAP: Traxler Root: 4...Bc5!?",
    "description": "DRILL: critical priority",
    "playerColor": "black",
    "startFen": "r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 5 4",
    "theory": "1... Bc5!? { Traxler Counter-Attack. Black ignores the f7 threat and counter-attacks. 'Take f7 if you want it — you will pay.' Two White responses: 5.Nxf7 (greedy, takes bait) or 5.Bxf7+ (best, sidesteps trap). DRILL: From 4.Ng5 — play 4...Bc5 without hesitation. Automatic. } *",
    "moves": [
      "Bc5!?"
    ],
    "attempts": 0,
    "perfectSessions": 0
  },
  {
    "id": "payload-ch-9",
    "name": "TRAP: Traxler Accepted: 5.Nxf7 Bxf2+!!",
    "description": "DRILL: critical priority",
    "playerColor": "black",
    "startFen": "r1bqk2r/pppp1Npp/2n2n2/2b1p3/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 5",
    "theory": "1... Bxf2+!! { THE TRAP. Bishop sac — Black ignores f7 knight and drags White's king into the open. White's three king responses: 6.Kxf2 — main line, see Chapter 10. 6.Ke2 — Nd4+! fork (Nc6→d4, attacks king and threatens Nxc2). 6.Kf1 — Bh4! keep pressure, king displaced } 2. Kxf2 Nxe4+ { Fork — attacks king on f2, threatens Nc3 next } *",
    "moves": [
      "Bxf2+!!",
      "Kxf2",
      "Nxe4+"
    ],
    "attempts": 0,
    "perfectSessions": 0
  },
  {
    "id": "payload-ch-10",
    "name": "TRAP: Traxler Main Attack: 7...Qh4!",
    "description": "DRILL: critical priority",
    "playerColor": "black",
    "startFen": "r1bqk2r/pppp1Npp/2n5/4p3/2B1n3/8/PPPP2PP/RNBQ2KR b kq - 1 7",
    "theory": "1... Qh4! { THE KILLER MOVE. Queen enters with decisive tempo. Threatens Qxf2+ (which is IMMEDIATE CHECKMATE if White plays Nxh8 — see Chapter 11). Also threatens Qg4+ and Qe1+. White is completely paralyzed. DRILL: Find Qh4! in under 5 seconds. } *",
    "moves": [
      "Qh4!"
    ],
    "attempts": 0,
    "perfectSessions": 0
  },
  {
    "id": "payload-ch-11",
    "name": "TRAP: Traxler Mate Trap (Trap)",
    "description": "DRILL: high priority",
    "playerColor": "black",
    "startFen": "r1bqk2r/pppp1Npp/2n5/4p3/2B1n3/8/PPPP2PP/RNBQ2KR b kq - 1 7",
    "theory": "1... Qh4 2. Nxh8?? { White greedily takes the h8 rook — fatal mistake. } 2... Qxf2# { IMMEDIATE CHECKMATE. No Ng3 needed. WHY IT'S MATE: Queen on f2 covers: f1 (f-file), g2 (rank 2), h2 (rank 2). White's own Rh1 blocks king's only other escape square: h1. King on g1 has ZERO legal moves. Checkmate. The Rh1 — never moved because White never castled — ironically seals its own king's fate. DRILL: After Qh4, if White plays Nxh8 — find Qxf2# instantly. } *",
    "moves": [
      "Qh4",
      "Nxh8??",
      "Qxf2#"
    ],
    "attempts": 0,
    "perfectSessions": 0
  },
  {
    "id": "payload-ch-12",
    "name": "TRAP: Best White Rebuttal: 5.Bxf7+ Ke7 6.Bb3 (WhiteRefutation)",
    "description": "DRILL: high priority",
    "playerColor": "black",
    "startFen": "r1bqk2r/pppp1ppp/2n2n2/2b1p1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 5 5",
    "theory": "1. Bxf7+! Ke7 { White sidesteps the Traxler entirely. Does NOT take with Nxf7. Bxf7+ takes the pawn safely with check — Black's king is displaced. 5...Ke7 is forced best. King on e7 is alive but stuck in the center. } 2. Bb3! { Safest retreat — avoids tactical tricks on d5. Bishop on b3 is secure. TRAP FOR WHITE: 2.Bd5?? allows 2...Rf8! hitting bishop with Rxf7 ideas. White plan: O-O, Nc3, d3 — clean development, convert extra pawn. } 2... d6 3. O-O Rf8 4. Nc3 { Black tries to activate with Rf8 pressure on f7. White: pawn up, castled, fully developed. Black: king on e7, center stuck, fighting for compensation. } *",
    "moves": [
      "Bxf7+!",
      "Ke7",
      "Bb3!",
      "d6",
      "O-O",
      "Rf8",
      "Nc3"
    ],
    "attempts": 0,
    "perfectSessions": 0
  },
  {
    "id": "payload-ch-13",
    "name": "TRAP: White Reference: 6.d3 / 6.d4 vs Fried Liver (WhiteRefutation)",
    "description": "Learn position",
    "playerColor": "black",
    "startFen": "r1bqkb1r/ppp2ppp/2n5/3np1N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 0 6",
    "theory": "1. d3 { Solid White option — avoids Fried Liver entirely. Normal development: Nc3, O-O, Qe2. No risk. Clean positional edge. Black's knight dance cost tempo with no compensation. } ( 1. d4 { Lolli Attack — more aggressive central strike. 6...exd4? 7.O-O gives White pawn roller. 6...Be7 7.O-O is solid for White. Both d3 and d4 are objectively superior to the Fried Liver sac. } ) 1... Nc6 *",
    "moves": [
      "d3",
      "Nc6"
    ],
    "attempts": 0,
    "perfectSessions": 0
  },
  {
    "id": "payload-ch-14",
    "name": "TRAP: White Reference: Bxf7+ vs Traxler (WhiteRefutation)",
    "description": "DRILL: high priority",
    "playerColor": "black",
    "startFen": "r1bqk2r/pppp1ppp/2n2n2/2b1p1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 5 5",
    "theory": "1. Bxf7+! { White's ONLY correct response to the Traxler. ALWAYS Bxf7+. NEVER Nxf7. 5.Nxf7 falls into Bxf2+!! and the position collapses. Bxf7+ = clean extra pawn, Black's king displaced, no tactics for Black. } 1... Ke7 2. Bb3 Rf8 3. O-O d6 4. Nc3 { White: pawn up, castled, fully developed. Black: king on e7, stuck in center, no real compensation. Drill (as White): From 4...Bc5 — Bxf7+ is automatic. No hesitation, no Nxf7. } *",
    "moves": [
      "Bxf7+!",
      "Ke7",
      "Bb3",
      "Rf8",
      "O-O",
      "d6",
      "Nc3"
    ],
    "attempts": 0,
    "perfectSessions": 0
  }
];

/// The Gentleman's Assassin 9-move White cage, derived from the canonical
/// mirror-italian line above — the single source of truth Autopsy's
/// doctrine checker compares real games against.
export const CAGE_MOVES: string[] = repertoire
  .find((r) => r.id === 'mirror-italian')!
  .moves.filter((_, i) => i % 2 === 0)
  .slice(0, 9)
  .map((m) => m.replace(/[+#!?]/g, ''));
