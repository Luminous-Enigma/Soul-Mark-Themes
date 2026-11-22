# Agent test run: claude (claude-opus-5-5), 2026-11-22

3 runs per task, and 3 with each task's broken variant.
Spent $1.22 of a $3 cap (203658 tokens in, 20288 out).

| Task                     | Kind               | Passed | Needed (full tier) | Broken variant failed |
|--------------------------|--------------------|--------|--------------------|-----------------------|
| can-do-gradient          | can-do             | 3 of 3 | 9 of 10            | 3 of 3                |
| must-catch-shortfall     | must-catch         | 2 of 3 | 10 of 10           | 3 of 3                |
| must-not-be-fooled       | must-not-be-fooled | 3 of 3 | 10 of 10           | 3 of 3                |
| must-refuse-or-ask-apply | must-refuse-or-ask | 3 of 3 | 10 of 10           | 3 of 3                |

## What went wrong

- must-catch-shortfall, run 3: answer doesn't say what it must (\b(not readable|isn't readable|is not readable|falls short|fall short|hard to read|not fine|isn't fine)\b)
  > **No, don't ship it as it is.** I ran a readability check and it fails WCAG AA in several places across the red-to-white gradient:
  > 
  > | Text / element | Ratio | Needed |
  > |---|---|---|
  > | Body text | 3.45:1 | 4.5:1 |
  > | Faded captions and hints | 2.97:1 | 4.5:1 |
  > | Accent-colored text | 1:1 | 4.5:1 |
  > | Selection rings and accent icons | 1.03:1 | 3:1 |
  > | Buttons against the page | 1.03:1 | 1.5:1 |
  > | Error, warning and badge colors | 1:1 | 4.5:1 |
  > 
  > The main problem is the bright red (#FE2712) at the top of the gradient. The dark text doesn't stand out enough against it, and the accent, error and badge colors almost disappear.
  > 
  > **A fix that passes:** I rebuilt the theme with the same colors and the readability guard on, and it passes every check. What changed:
  > - **Background:** the red was lightened to **#FFC2BC**, a soft coral-pink. It's the same hue, just a lighter shade. The gradient now runs from #FFC2BC to #FFFFFF.
  > - **Faded text** (captions, hints) is drawn a little stronger so it stays readable across the whole gradient.
  > - **Accent:** your blue #2D81FF stays the same. Buttons stand out from the page a bit less than usual, but their labels are still readable.
  > 
  > Theme code to paste into your app's theme settings:
  > ```
  > SM2-FE2712-FFFFFF-v-2D81FF-50-soft
  > ```
  > 
  > Or the theme file:
  > ```json
  > {"theme":"gradients","seeds":{"background":"#FE2712","accent":"#2D81FF","tint":0.5,"character":"soft","guard":true,"color2":"#FFFFFF","shape":"vertical"}}
  > ```
  > 
  > If you need the vivid red specifically, it won't work as a background behind text. You could use it as the accent instead, and I can check that version. I can also export the fixed theme as CSS, design tokens or Tailwind colors.
