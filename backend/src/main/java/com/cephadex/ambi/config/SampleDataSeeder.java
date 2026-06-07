package com.cephadex.ambi.config;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.common.Ownership;
import com.cephadex.ambi.common.enums.OwnershipType;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.DeckRepository;
import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;
import com.cephadex.ambi.presentation.deck.Settings.SlideSettings;
import com.cephadex.ambi.presentation.deck.config.DeckDefaultsProperties;
import com.cephadex.ambi.presentation.deck.enums.DeckVisibility;
import com.cephadex.ambi.presentation.deck.enums.PublishStatus;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.SlideRankService;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.McqOptionType;
import com.cephadex.ambi.theme.Theme;
import com.cephadex.ambi.theme.ThemeRepository;
import com.cephadex.ambi.theme.ThemeSpec;
import com.cephadex.ambi.theme.enums.ThemeMode;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserRepository;
import com.cephadex.ambi.user.enums.UserLevel;

//TODO: Add this to runbook
/**
 * Manually populates MongoDB with LOTR-themed sample data for the rewritten
 * backend: a handful of registered users, a few built-in {@link Theme presets},
 * and a set of public quiz {@link Deck decks} of MCQ slides.
 *
 * <p>
 * <strong>Activation.</strong> Wired only when {@code seed.run=true} (passed
 * by {@code scripts/seed-sample-data.sh}); a normal {@code spring-boot:run}
 * boot
 * does nothing. After seeding the application exits — the script binds a random
 * port so this can run alongside a normally-running backend on 8080.
 *
 * <p>
 * <strong>Idempotency.</strong> Everything is keyed on a natural identity
 * (username / deck {@code publicId} / built-in theme name) and created only
 * when
 * absent, so re-running never duplicates and never deletes. We deliberately
 * check-then-create rather than lean on DB uniqueness:
 * {@code auto-index-creation}
 * is off and an {@link ApplicationRunner} fires before
 * {@code UserIndexInitializer}
 * has built the {@code users} indexes, so they cannot be relied on here.
 *
 * <p>
 * <strong>{@code seed.clear=true}.</strong> Drops {@code decks}, {@code themes}
 * and {@code app_images} and removes <em>only</em> the canonical sample users
 * (by username) before re-seeding — real accounts (e.g. your logged-in Google
 * user) are preserved. Use this when a schema change has left documents Spring
 * Data can no longer deserialize.
 *
 * <p>
 * <strong>Content shape.</strong> Slides are MCQ-only: {@code McqContent} is
 * the only {@code SlideContent} subtype currently wired into the Jackson
 * discriminator union, so it is the only body that round-trips cleanly through
 * the API. Adding TITLE/MEDIA/etc. sample slides should wait until those types
 * are wired in {@code SlideContent}.
 */
@Component
@ConditionalOnProperty(name = "seed.run", havingValue = "true")
public class SampleDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SampleDataSeeder.class);

    private final UserRepository userRepository;
    private final ThemeRepository themeRepository;
    private final DeckRepository deckRepository;
    private final SlideRankService ranks;
    private final MongoTemplate mongoTemplate;
    private final ConfigurableApplicationContext context;
    private final DeckDefaultsProperties deckDefaults;

    public SampleDataSeeder(UserRepository userRepository, ThemeRepository themeRepository,
            DeckRepository deckRepository, SlideRankService ranks, MongoTemplate mongoTemplate,
            ConfigurableApplicationContext context, DeckDefaultsProperties deckDefaults) {
        this.userRepository = userRepository;
        this.themeRepository = themeRepository;
        this.deckRepository = deckRepository;
        this.ranks = ranks;
        this.mongoTemplate = mongoTemplate;
        this.context = context;
        this.deckDefaults = deckDefaults;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean clear = args.containsOption("seed.clear")
                && parseFlag(args.getOptionValues("seed.clear"));

        log.info("SampleDataSeeder starting (clear={})", clear);
        if (clear) {
            clearSeededData();
        }

        Instant now = Instant.now();
        Map<String, Theme> themes = seedBuiltInThemes();
        seedSampleUsers(now);
        seedSampleDecks(themes, now);
        seedPersonalDecksForExistingUsers(themes, now);

        log.info("SampleDataSeeder finished — exiting.");
        int code = SpringApplication.exit(context, () -> 0);
        System.exit(code);
    }

    // ── Clear ────────────────────────────────────────────────────────────────

    private void clearSeededData() {
        mongoTemplate.dropCollection(Deck.class);
        mongoTemplate.dropCollection(Theme.class);
        mongoTemplate.dropCollection(AppImage.class);
        for (SampleUser s : SAMPLE_USERS) {
            userRepository.findByUsername(s.username()).ifPresent(userRepository::delete);
        }
        log.info("Cleared decks, themes, app_images and {} sample users", SAMPLE_USERS.size());
    }

    // ── Themes ─────────────────────────────────────────────────────────────────

    /** App-provided presets everyone can use. Keyed by name for deck references. */
    private Map<String, Theme> seedBuiltInThemes() {
        Map<String, Theme> existing = new LinkedHashMap<>();
        for (Theme t : themeRepository.findByBuiltInTrue()) {
            existing.put(t.getName(), t);
        }

        Map<String, ThemeSpec> presets = new LinkedHashMap<>();
        // OKLCH hues (primary, accent): a small spread of light/dark presets so the
        // theme picker has a real built-in selection out of the box.
        presets.put("Middle-earth Light", new ThemeSpec(ThemeMode.LIGHT, 140, 90, null, null));
        presets.put("Mordor Dark", new ThemeSpec(ThemeMode.DARK, 25, 35, null, null));
        presets.put("Rivendell", new ThemeSpec(ThemeMode.LIGHT, 225, 280, null, null));
        presets.put("Lothlórien", new ThemeSpec(ThemeMode.LIGHT, 160, 95, null, null));
        presets.put("Rohan Gold", new ThemeSpec(ThemeMode.LIGHT, 75, 45, null, null));
        presets.put("Misty Mountains", new ThemeSpec(ThemeMode.DARK, 220, 200, null, null));
        presets.put("Shadow of Moria", new ThemeSpec(ThemeMode.DARK, 285, 50, null, null));

        Map<String, Theme> result = new LinkedHashMap<>();
        for (Map.Entry<String, ThemeSpec> e : presets.entrySet()) {
            Theme theme = existing.get(e.getKey());
            if (theme == null) {
                theme = new Theme();
                theme.setName(e.getKey());
                theme.setBuiltIn(true);
                theme.setSpec(e.getValue());
                theme = themeRepository.save(theme);
                log.info("Seeded built-in theme '{}'", e.getKey());
            }
            result.put(e.getKey(), theme);
        }
        return result;
    }

    // ── Users ──────────────────────────────────────────────────────────────────

    private record SampleUser(String username, String email, String displayName,
            String externalId, UserLevel level) {
    }

    private static final List<SampleUser> SAMPLE_USERS = List.of(
            new SampleUser("frodo", "frodo.baggins@shire.me", "Frodo Baggins",
                    "seed-google-frodo", UserLevel.USER),
            new SampleUser("gandalf", "gandalf@istari.me", "Gandalf the Grey",
                    "seed-google-gandalf", UserLevel.USER),
            new SampleUser("aragorn", "aragorn@gondor.me", "Aragorn",
                    "seed-google-aragorn", UserLevel.ADMIN));

    /** Create the canonical sample users if absent. */
    private void seedSampleUsers(Instant now) {
        for (SampleUser s : SAMPLE_USERS) {
            if (userRepository.findByUsername(s.username()).isPresent()) {
                continue;
            }
            User user = User.newRegistered(AuthProvider.GOOGLE, s.externalId(),
                    s.email(), s.username(), s.displayName(), now);
            if (s.level() != UserLevel.USER) {
                user.setUserLevel(s.level());
            }
            userRepository.save(user);
            log.info("Seeded sample user '{}'", s.username());
        }
    }

    private String userIdFor(String username) {
        return userRepository.findByUsername(username)
                .map(User::getId)
                .orElseThrow(() -> new IllegalStateException("Sample user missing: " + username));
    }

    // ── Decks ────────────────────────────────────────────────────────────────────

    private void seedSampleDecks(Map<String, Theme> themes, Instant now) {
        String frodoId = userIdFor("frodo");
        String gandalfId = userIdFor("gandalf");
        String aragornId = userIdFor("aragorn");

        ensurePublicDeck("sample-fellowship-trivia", "Tolkien Trivia: The Fellowship",
                "Test your knowledge of the Fellowship of the Ring.",
                frodoId, themes.get("Middle-earth Light"), Set.of("lotr", "trivia", "easy"),
                "fellowship", now, List.of(
                        mcq("What is the name of Bilbo's sword?",
                                "Sting glows blue when orcs are near.", Difficulty.EASY, frodoId,
                                opt("Sting", true), opt("Glamdring", false),
                                opt("Orcrist", false), opt("Andúril", false)),
                        mcq("Who leads the Fellowship out of Rivendell?",
                                "Gandalf the Grey guides them until Moria.", Difficulty.EASY, frodoId,
                                opt("Gandalf", true), opt("Aragorn", false),
                                opt("Frodo", false), opt("Boromir", false)),
                        mcq("What must be destroyed in the fires of Mount Doom?",
                                "Only the fire where it was forged can unmake it.", Difficulty.EASY, frodoId,
                                opt("The One Ring", true), opt("The Arkenstone", false),
                                opt("The Palantír", false), opt("Sting", false)),
                        mcq("What race is Legolas?",
                                "Legolas is a Sindar elf of the Woodland Realm.", Difficulty.EASY, frodoId,
                                opt("Elf", true), opt("Dwarf", false),
                                opt("Hobbit", false), opt("Man", false))));

        ensurePublicDeck("sample-creatures-middle-earth", "Creatures of Middle-earth",
                "Beasts, monsters, and the folk of Middle-earth.",
                gandalfId, themes.get("Mordor Dark"), Set.of("lotr", "creatures", "medium"),
                "creatures", now, List.of(
                        mcq("What kind of creature was Gollum, originally?",
                                "Sméagol was a Stoor, a kind of hobbit.", Difficulty.MEDIUM, gandalfId,
                                opt("A hobbit", true), opt("An orc", false),
                                opt("An elf", false), opt("A goblin", false)),
                        mcq("Shelob is a giant...?",
                                "She lairs in the tunnels of Cirith Ungol.", Difficulty.EASY, gandalfId,
                                opt("Spider", true), opt("Eagle", false),
                                opt("Wolf", false), opt("Bat", false)),
                        mcq("A Balrog is a creature of which element?",
                                "A demon of shadow and flame.", Difficulty.MEDIUM, gandalfId,
                                opt("Fire", true), opt("Water", false),
                                opt("Ice", false), opt("Stone", false)),
                        // A 3-of-4 multi-select to exercise correctOptionIds / maxSelections.
                        mcqMulti("Which of these are members of the Fellowship? (Choose 3)",
                                "Sauron is the enemy, not a member of the Fellowship.",
                                Difficulty.MEDIUM, 3, gandalfId,
                                opt("Frodo", true), opt("Samwise", true),
                                opt("Legolas", true), opt("Sauron", false))));

        ensurePublicDeck("sample-battles-middle-earth", "Battles of Middle-earth",
                "From Helm's Deep to the Pelennor Fields.",
                aragornId, themes.get("Rivendell"), Set.of("lotr", "battles", "hard"),
                "battles", now, List.of(
                        mcq("Where was the Battle of the Hornburg fought?",
                                "Better known as Helm's Deep.", Difficulty.MEDIUM, aragornId,
                                opt("Helm's Deep", true), opt("Minas Tirith", false),
                                opt("Isengard", false), opt("Osgiliath", false)),
                        mcq("Who slew the Witch-king of Angmar?",
                                "'No living man am I!' — Éowyn of Rohan.", Difficulty.HARD, aragornId,
                                opt("Éowyn", true), opt("Aragorn", false),
                                opt("Gandalf", false), opt("Merry", false)),
                        mcq("How many Rings of Power were given to the Dwarf-lords?",
                                "Seven for the Dwarf-lords in their halls of stone.", Difficulty.HARD, aragornId,
                                opt("Seven", true), opt("Three", false),
                                opt("Nine", false), opt("One", false))));
    }

    /**
     * Give every <em>non-sample</em> existing user (e.g. your logged-in Google
     * account) one private starter deck so "My Decks" isn't empty — only if they
     * own none yet.
     */
    private void seedPersonalDecksForExistingUsers(Map<String, Theme> themes, Instant now) {
        Set<String> sampleUsernames = new LinkedHashSet<>();
        for (SampleUser s : SAMPLE_USERS) {
            sampleUsernames.add(s.username());
        }

        for (User user : userRepository.findAll()) {
            if (user.getUsername() != null && sampleUsernames.contains(user.getUsername())) {
                continue;
            }
            boolean ownsDeck = !deckRepository
                    .findByOwnershipTypeAndOwnershipOwnerId(OwnershipType.USER, user.getId())
                    .isEmpty();
            if (ownsDeck) {
                continue;
            }
            Deck deck = buildDeck("sample-personal-" + user.getId(), "My First Deck",
                    "A private starter deck — edit or delete it.",
                    user.getId(), themes.get("Middle-earth Light"), Set.of("starter"),
                    PublishStatus.DRAFT, DeckVisibility.PRIVATE, null, now, List.of(
                            mcq("Which hobbit carried the One Ring to Mordor?",
                                    "Samwise carried Frodo, but Frodo bore the Ring.",
                                    Difficulty.EASY, user.getId(),
                                    opt("Frodo", true), opt("Sam", false),
                                    opt("Merry", false), opt("Pippin", false))));
            deckRepository.save(deck);
            log.info("Seeded personal starter deck for user '{}'", user.getUsername());
        }
    }

    // ── Deck / slide builders ───────────────────────────────────────────────────

    /** Build, save (if absent by publicId) and return a PUBLIC + PUBLISHED deck. */
    private Deck ensurePublicDeck(String publicId, String name, String description, String ownerId,
            Theme theme, Set<String> tags, String coverSeed, Instant now, List<Slide> slides) {
        Deck existing = deckRepository.findByPublicId(publicId).orElse(null);
        if (existing != null) {
            return existing;
        }
        AppImage cover = picsumCover(coverSeed, name);
        Deck deck = buildDeck(publicId, name, description, ownerId, theme, tags,
                PublishStatus.PUBLISHED, DeckVisibility.PUBLIC, cover, now, slides);
        deck = deckRepository.save(deck);
        log.info("Seeded deck '{}' ({} slides)", name, slides.size());
        return deck;
    }

    private Deck buildDeck(String publicId, String name, String description, String ownerId,
            Theme theme, Set<String> tags, PublishStatus status, DeckVisibility visibility,
            AppImage cover, Instant now, List<Slide> slides) {
        Deck deck = new Deck();
        deck.setId(UUID.randomUUID().toString());
        deck.setPublicId(publicId);
        deck.setName(name);
        deck.setDescription(description);
        deck.setCoverImage(cover);
        deck.setThemeId(theme != null ? theme.getId() : null);
        deck.setPublishStatus(status);
        deck.setVisibility(visibility);
        deck.setPublishedAt(status == PublishStatus.PUBLISHED ? now : null);
        deck.setLanguage(deckDefaults.getLanguage());
        deck.setCreatorUserId(ownerId);
        deck.setOriginalAuthorUserId(ownerId);
        deck.setOwnership(new Ownership(OwnershipType.USER, ownerId));
        deck.setTags(new LinkedHashSet<>(tags));
        deck.setSettings(deckDefaults.deckSettings());

        // Assign evenly-spaced LexoRank keys so the embedded list has a real order.
        List<String> sortKeys = ranks.evenlySpaced(slides.size());
        for (int i = 0; i < slides.size(); i++) {
            slides.get(i).setSortOrder(sortKeys.get(i));
            deck.addSlide(slides.get(i));
        }
        return deck;
    }

    /** A single-correct MCQ slide ({@code maxSelections = 1}). */
    private Slide mcq(String question, String explanation, Difficulty difficulty, String userId,
            OptionDef... options) {
        return mcqMulti(question, explanation, difficulty, 1, userId, options);
    }

    /**
     * An MCQ slide allowing up to {@code maxSelections} choices; correct options
     * carry the points.
     */
    private Slide mcqMulti(String question, String explanation, Difficulty difficulty,
            int maxSelections, String userId, OptionDef... options) {
        List<McqOption> built = new ArrayList<>();
        Set<String> correct = new LinkedHashSet<>();
        for (OptionDef def : options) {
            String optId = UUID.randomUUID().toString();
            built.add(new McqOption(new String(optId), McqOptionType.TEXT, def.text(), null, null));
            if (def.correct()) {
                correct.add(optId);
            }
        }
        McqContent content = new McqContent(built, correct);
        // pointValue/shuffle/maxSelections/allowAnonymous now live on the slide's
        // answer settings; difficulty/explanation are top-level slide fields. Start
        // from the deck defaults and override only what this sample slide varies:
        // multi-select follows maxSelections, and sample MCQs disallow anonymous
        // answers.
        AnswerSettings base = deckDefaults.answerSettings();
        SlideSettings settings = new SlideSettings(
                null, // inherit deck point defaults
                new AnswerSettings(base.displayResultsLive(), maxSelections != 1,
                        base.shuffleOptions(), base.anonymizeAnswers(), base.countdownTime(),
                        false, maxSelections));
        return slide(question, content, difficulty, explanation, settings, userId);
    }

    private Slide slide(String title, SlideContent content, Difficulty difficulty, String explanation,
            SlideSettings settings, String userId) {
        Slide slide = new Slide();
        slide.setId(UUID.randomUUID().toString());
        slide.setTitle(title);
        slide.setContent(content);
        slide.setDifficulty(difficulty);
        slide.setExplanation(explanation);
        slide.setSettings(settings);
        slide.setVersion(0);
        slide.setCreatedByUserId(userId);
        slide.setLastEditedByUserId(userId);
        return slide;
    }

    private AppImage picsumCover(String seed, String altText) {
        AppImage image = new AppImage();
        image.setExternal(true);
        image.setExternalSrc("https://picsum.photos/seed/ambi-" + seed + "/800/450");
        image.setAltText(altText);
        return image;
    }

    private record OptionDef(String text, boolean correct) {
    }

    private OptionDef opt(String text, boolean correct) {
        return new OptionDef(text, correct);
    }

    private static boolean parseFlag(List<String> values) {
        return values == null || values.isEmpty() || Boolean.parseBoolean(values.get(0));
    }
}
