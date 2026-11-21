# Soul Mark Themes

Most apps give you black, white or dark blue. These themes put every color back in your hands.
Free and open for any app.

We're in the age of AI, and the choice of how your software looks is still yours: a mark of your
own taste, your own soul. Soul Mark Themes gives everyday users and creators alike the freedom to
personalize the software they use, and gives developers a drop-in way to offer it. Every theme
keeps text readable, so you can be as bold as you like without losing anything.

## The themes

Soul Mark: Solid Tones (v1) is the theme contributed to
[ArtCraft](https://github.com/storytold/artcraft-services).

| Theme                      | What it is                                                                | Status                   |
|----------------------------|---------------------------------------------------------------------------|--------------------------|
| Soul Mark: Solid Tones, v1 | Solid colors with a readability guard, exactly as contributed to ArtCraft | After ArtCraft merges it |
| Soul Mark: Solid Tones, v2 | The same theme, agent-ready: files, CLI, CI and MCP                       | In progress              |
| Soul Mark: Gradients       | Two or three colors flowing into each other, still readable               | Built, in review         |
| Soul Mark: Neon            | Heads-up display: glowing lines on near-black                             | Next                     |
| Soul Mark: Glass           | Frosted, see-through backgrounds, windows and menus, with clear text      | Planned                  |
| Soul Mark: High Contrast   | Strong, clear colors for anyone who wants them                            | Planned                  |
| Soul Mark: Patterns        | Textures and patterns behind the interface                                | Planned                  |

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the order and what each one includes.

## Agent-ready

Everything here follows [Cornerstone](https://github.com/Luminous-Enigma/Cornerstone): each theme
ships as plain theme files with a schema, a command line tool, automatic CI checks, an MCP server
so AI assistants can make and check themes, and a skill that teaches them how. A person, a script
and an AI can all use it, and agent tests prove an AI uses it correctly and safely.

Every pull request runs Cornerstone's safety gates and their self-test
([what they check](https://github.com/Luminous-Enigma/Cornerstone/blob/main/docs/GATES.md)):

```bash
bash scripts/test-gates.sh
```

```bash
bash scripts/public-gates.sh
```

Security problems: please report them privately, as [SECURITY.md](SECURITY.md) explains.

## License

[MIT](LICENSE): use it in any app, change it, share it. Keep the copyright line.

The copy of Soul Mark v1 that lives in ArtCraft is under ArtCraft's own license there; this
repository is where Soul Mark is published openly.
