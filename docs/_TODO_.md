- ✅ Add languages (Dutch, Arabic, German, French, Spanish).

- ✅ Add preview button on the exercises catalog for exercises which has a video.

- ✅ Localize remaining fields:
    - ✅ Home page: Favorite Exercises listing
    - ✅ Workouts page: days of week on the listing are not localized. 
    - ✅ Workouts page: number of exercises per workout, for example the Arabic versions show "3 exercises ~6m 30s" which is not an Arabic string, while the Dutch version shows Dutch words which suggests the problem is in the Arabic translation either the key is missing or has the English value.
    - ✅ Edit Workout: listing of exercises in the workout is still not localized.
    - ✅ Add Workout: the exercise selector listing all exercises is not localized.
    - ✅ Add Workout: weekday names are not localized.
    - ✅ Exercises page: the tags are still not localized. Should these be treated as enumeration?
    - ✅ Log page: at the top, exercise categories (e.g. Core) are not localized.
    - ✅ Log page: in the listing of log entries, exercise names are not localized.
    - ✅ Log page: in the listing of log entries, completion status for each are not localized (e.g. Completed 2 sets of 8 reps, or Completed 30s interval timer, or Stopped after 15s).
    - ✅ Log page: the name of the favorite exercise mentioned in the statistics part at the top is not localized.
    - ✅ In Arabic, the short weekday names match the full weekday names, there is no abbreviated form such as Fri for Friday in English. Correct the values in the Arabic locale files accordingly.
    - ✅ The Activity Log shows the dates in English, and reflects the duration in English (e.g. 1m, 30s, etc)
    - ✅ The Arabic home page shows at the top a non-localized string "Your personal exercise timer"
    - ✅ The "Hand Warmup" category is not localized in the Arabic version on the activity log.

- ✅ Solve Remaining Localization Issues:
    - ✅ In Arabic, both Workouts and Exercises translate to the same word "تمارين". I've opted to translate Workouts to "البرامج" and Exercises to "التمارين". This is reflected on the navigation menu. However many strings inside the Workouts module need to be adjusted to reflect that translation choice. Examples: "إنشاء تمرين", "تعديل التمرين", "اسم التمرين
", "تمرين نشط (يمكن جدولته للتدريب)", "حفظ التمرين"
- ✅ Edit Workout Page - Arabic version: the workout I am editing is flagged for one day a week and the description is correct "مجدول لـ 1 يوم في الأسبوع", however when I select another day the description changes to English "Scheduled for 2 days per week".
- ✅ The Arabic short weekday names in Edit Workout are different from Create Workout. The names used in Create Workout are correct. Fix it in Edit Workout to match Create Workout.

- ✅ Video Enhancements:
    - ✅ When user clicks the play button on one of the exercises, the video panel should open and the video should auto-play. Currently the user must click/tap Play on the video player.
    - ✅ If an exercise is marked with hasVideo as true yet no video was found, then an error message should be displayed "Video is not available at this time", instead of opening the player anyway while there is no video.
    - ✅ I marked the Side Plank exercise as hasVideo=true while it has no video to be able to test the error handling. Expected behavior is that an error toast should be displayed with message like "Video is not available at this time" but what happened is that the video panel opened trying to load a video that does not exist.

- Add locales Turkish, Persian, and Frisian

- 🔄 Add remaining videos.

- Collect analytics on the server side about usage.

- Create user agreement and privacy policy

- ✅ Add accounts module, sign-up/sign-in, profile, etc

- Fix issues 2025-08-25:
    - ✅ When I switch to Dark Mode and add a couple of exercises to favorites then reload the page (refresh), the dark mode is gone and the favorites are gone. This was supposedly fixed earlier (and verified).
    - ✅ I opted to login via magic link, received the email with the link, clicked it, and the app opened with an error on top (Sync failed) (Sync endpoint error: Edge Function returned a non-2xx status code) with two actions to Dismiss or Retry. This error is persistent and doesn't disappear even when the server is online.
    - ✅ On Mon 25-Aug I created a Workout for Tue and Fri and the Home screen workout panel said next exercise Tue 25-Aug, Start now. The correct date is Tue 26-Aug.
    - ✅ I created a workout of Plank, Burpees, then Finger Rolls. The videos were not displayed for Plank or Burpees in the workout mode although both exercises have videos, and the "Show Exercise Demo Videos" toggle was enabled. The videos were displayed when the same exercises were run in standalone mode before I ran the workout. After completing the Workout the same exercises did not play the videos again in standalone mode, and there was a very thin small green line on the timer component, which may suggest some UI problem was there.
    - ✅ A "cancel" label is not translated in the Arabic locale files.
    - 🔄 Sign-up with biometrics fails with error "Failed to send a request to the Edge Function"
    - ✅ This text is repeated on the console in an endless loop: "🚀 Initializing app with consent granted
App.tsx:1391 🚀 Initializing PWA capabilities...
serviceWorker.ts:28 🔧 Service worker not registered in development mode
App.tsx:1459 ⚙️ Loaded stored settings: {id: 'default-app-settings', intervalDuration: 30, soundEnabled: true, vibrationEnabled: true, beepVolume: 0.5, …}
App.tsx:1469 ⚙️ Final settings to set: {id: 'default-app-settings', intervalDuration: 30, soundEnabled: true, vibrationEnabled: true, beepVolume: 0.5, …}
App.tsx:1387 🚀 Initializing app with consent granted
App.tsx:1391 🚀 Initializing PWA capabilities...
serviceWorker.ts:28 🔧 Service worker not registered in development mode
App.tsx:1459 ⚙️ Loaded stored settings: {id: 'default-app-settings', intervalDuration: 30, soundEnabled: true, vibrationEnabled: true, beepVolume: 0.5, …}
App.tsx:1469 ⚙️ Final settings to set: {id: 'default-app-settings', intervalDuration: 30, soundEnabled: true, vibrationEnabled: true, beepVolume: 0.5, …}"
    - 🔄 I signed up on Firefox after entering email, screen name, and password. I tried to sign in from Edge with the email and password yet I get message "Invalid login credentials", while I entered the email address and password correctly.
    - ✅ I signed in with magic link on Firefox, received the login link, then pasted it in a new tab in Firefox. I got a message in a green overlay saying "Welcome! Your Data is Safe Successfully migrated 27 records from your local storage Migrated: 26 exercises and 1 settings" but at the same time I got a Red toast on top of the screen wwith error "Sync failed Sync endpoint error: Edge Function returned a non-2xx status code • Last attempt: 2m ago", while the console in the developer tools is continuously printing text like it's in an endless loop.
    - ✅ In this message "Welcome! Your Data is Safe Successfully migrated 27 records from your local storage Migrated: 26 exercises and 1 settings" I expect a lot more data to be synced. 26 exercises is the global exercise catalog. What I expect to be synced is also my own Workouts with their own settings, the activity log, and all the settings I set.
    - ✅ There is no option to sign-out after I have signed-in. There should be a Profile part at the top of the settings page where users can view their profile or sign out, or sign-in/up.
    - ✅ The sync failed error is not translated in non-English locales.
    - ✅ I want a Profile section at the top of the Settings page, not on top of the Settings menu. The Profile section on the settings page should give the user options to view profile, sign-in or sign out depending on their login status.
    - ✅ When the user is logged on, a section appears on top of the Settings menu item displaying the user's email address. Since we added a profile section to the Settings page I find this redundant. Remove the profile info on top of the Settings menu in navigation for logged on users.
    - ✅ Review all non-English translation files and translate any English strings there to the file's corresponding language. Note that ar-EG is the slang Egyptian Arabic.

- ✅ Sync Issues: I accessed the application from Edge, logged on via magic link, created a workout of Plank (27s), rest (15s), Burpees (3x4), rest (15s), Finger Roll (25s). Then I accessed the application via Firefox, switched the locale to Arabic then logged on. Here are some findings:
    - ✅ Although my Edge locale was English, when I logged on from Firefox the locale did not change from Arabic to English. This is expected behavior since language is one of the saved preferences.
    - ✅ I ran the workout till the end on Edge and I got a successful sync message and it was added to the activity log. But when I logged on from Firefox it did not sync the activity log from server.
    - ✅ The workout I created on Edge did not appear when I logged on from Firefox.
    - ✅ It seems like the sync is working in one direction from client to server but not from server to client, which defeats the purpose of one profile across devices.
    - ✅ All Edge function calls fail with error ( Supabase invoke error: FunctionsHttpError: Edge Function returned a non-2xx status code) and the application falls back to direct fetch. This needs investigation.

- ✅ Remove the successful sync message "Welcome! Your Data is Safe \n Successfully migrated 35 records from your local storage" if the Debug flag is off. If the sync is not successful then an error should be displayed in a toast indicating that the app is unable to sync with the server.

- ✅ This application is still under development and has no real users yet. I don't mind deleting the entire supabase database and starting over with a clean and clear design to solve this sync issue once and for all. I would like you to be critical and if you think this is a good idea then you need to create a detailed implementation plan with phases and tasks how you would do this step by step  and write it to docs/implementation-plans/sync-resolution.md. Such plan must be thorough and include an analysis of existing indexeddb entities and relations and application functionality to make sure everything is addressed.

- UX improvements:
    - ✅ In the main navigation menu, change the order of pages to be: Home, Exercises, Timer, Workouts, Log, and Settings
    - ✅ On the Home page there is a message with key home.availableExercises under the number of exercises. The number of exercises should be a link that takes the user to the Exercises page, and move this section up to replace the "Browse Exercises" button.
    - ✅ On the Exercises page, replace the categories dropdown menu in the filter with tags similar to how it is rendered in the Activity Log. This would allow the user to choose combinations of categories at a time, rather than just one.
    - ✅ On the Timer page, the timer itself is the main feature and if an exercise has a video the video gets rendered inside the timer's rings. I would like to give the timer rings more space on the page to improve the video visibility (for exercises which have videos), by minimizing the size of other elements on the page and avoiding vertical scrolling. The timer should be rendered in full without the need to scroll vertically on mobile devices.
    - ✅ When browser page becomes visible, sync is initiated and I get a sync result message like this one "Welcome! Your Data is Safe \n Successfully migrated 11 records from your local storage \n Migrated: 5 activity_logs, 3 workout_sessions, 1 user_preferences, and 2 other items". The user takes sync for granted, the successful message should be displayed only if debugging is toggled on in config/features.ts. Otherwise successful sync shouldn't trigger a message and a message should be rendered only if there is a problem.
    - ✅ Bug: When the server is down, the PWA app continues to run in the browser however all strings are displayed as keys (e.g. home.availableExercises) rather than localized text. 

- ✅ Provide a mechanism to force the PWA applications to refresh pages from server.

- ✅ After I install the app as PWA on my iphone's home screen and try to login via magic link, when I click the link in my inbox it opens the web browser and doesn't go to my installed pwa app. How can I resolve this?

- 👉 🔄 I want to add a feature allowing authenticated users to create their own exercises and also share them with other users. How does this impact the application and the database, and what's the best way to go about it? Don't implement anything until we agree on the implementation plan. -> docs\implementation-plans\user-created-exercises-implementation-plan.md

    - ✅ Implement [Phase 1: Database Schema Extensions] and update progress in the plan

    - ✅ docs\implementation-plans\user-created-exercises-implementation-plan.md: Implement any remaining tasks in phase 1 then implement [Phase 2: Backend API Extensions] and update progress in the plan per task/phase. Use supabase MCP if you need to access the database and edge functions if needed.

    - ✅ docs\implementation-plans\user-created-exercises-implementation-plan.md: Implement any remaining tasks in phase 2 then implement [Phase 3: Frontend UI Implementation] and update progress in the plan per task/phase. Use supabase MCP if you need to access the database and edge functions if needed.

    - ✅ docs\implementation-plans\user-created-exercises-implementation-plan.md: Implement any remaining tasks in phase 3 then implement [Phase 4: Discovery, Sharing & Rating Features] and update progress in the plan per task/phase. Use supabase MCP if you need to access the database and edge functions if needed.

    - ✅ docs\implementation-plans\user-created-exercises-implementation-plan.md: Implement any remaining tasks in phase 4 then implement [Phase 5: Storage & Sync Updates] and update progress in the plan per task/phase. Use supabase MCP if you need to access the database and edge functions if needed.

    - ✅ docs\implementation-plans\user-created-exercises-implementation-plan.md: Implement any remaining tasks in phase 5 then implement [Phase 6: Testing & Polish] and update progress in the plan per task/phase. Use supabase MCP if you need to access the database and edge functions if needed.
    
    - ✅ **MAJOR SUCCESS**: Created comprehensive translation generation script that reduced missing i18n keys from 1,200+ to just 25 across all 8 supported languages (98%+ complete). Generated 5 new namespace files and 100+ additional translation keys with smart fallback system.

- ✅ I don't see why the feature_flags table shouldn't exist. As explained earlier, the production supabase project "RepCue" is where all the recent changes were implemented while the dev project "repcue-dev" is missing all database changes related to exercise creation and sharing. I am not sure which supabase project the workspace is pointing to but it should be "repcue-dev" and repcue-dev should be brought up to date with the migrations. Give me a script to run on supabase console to fix the dev project then make sure that the workspace is pointing to the dev project and tell me how to verify that manually. The application should take care of updating IndexedDB where necessary to bring it up to date if it is not.

- ✅ How can I protect the application against the applicable OWASP top 10 (e.g. sql injection, session hijacking, cross-side scripting, etc) attacks if it's all running client-side? Can I perform input validation/sanitization on the edge functions on supabase? Make suggestions but don't implement unless I confirm. -> created owasp-implementation-plan.md

- ✅ While on the create exercise page, if I fill in some fields then change visibility (e.g. change tabs or change windows), the page resets and the entered fields disappear.

- 👉 🔄 The Edit Exercise page works now however I found a number of other issues:
    - ✅ While creating the exercise I entered some details like equipment, muscle groups, and tags. On the edit page these were all empty which suggests they were not saved.
    - ✅ I changed the sets/reps from 2x8 to 2x9 then clicked Save which took me back to the Exercises page and it was still showing 2x8 for the exercise I just edited. After refreshing the page the correct number was displayed 2x9.
    - 🔄 I created a number of other exercises earlier but there was a problem in the owner id so I cannot edit them now. However when creating these exercises I never marked them as Public, so if my owner id is not the same then I shouldn't see them at all because I don't own them and they're not public. Those exercises are: Pelvix (time-based), Pelvix (time-based), Ya 7amada (rep-based).
    - ✅ The listing of time-based user-created exercises seem to have a problem where the duration is not displayed on the card. Instead it says: "Default: exercises.variable".
    - ✅ There is a migration that's not applied to production yet, the column storing exercise duration is missing from the exercises table on production supabase project.
    - ✅ Rep duration should allow decimal point.

- ✅ What is the sequence of events when changing any data in the application? I assumed that all changes always go to IndexedDB first and the record is marked dirty then the sync service would push the changes to server. If that's the case, then when I edit an exercise then it should be saved to IndexedDB first and even if the sync hasn't taken place, the Exercises page should render up to date data. This application is meant to work completely offline (PWA).

- ✅ Being a PWA application with optional sign-up/sign-in, means that it shouldn't be an issue if exercises exist without an owner id. Maybe the owner id will be added if the user signs in?

- ✅ The video couldn't be uploaded at the time of creating an exercise because supabase mandated having the exercise uuid in order to be able to write the record to database. Changing the behavior of create/edit exercise to be offline-first, would I be able to upload the video at the same time I am creating the exercise?

- ✅ The exercise card on ExercisesPage is missing a delete button for user-owned exercises.

 - ✅ On Exercises page, the listing is mixed between built-in and user-created exercises. User-created exercises should be denoted somehow on the UI.
 I want to follow a combo/balanced approach to improve this:
    - ✅ Keep one listing, not split.
    - ✅ Built-in cards keep current look.
    - ✅ User-created cards:
        + ✅ Show a “Custom” badge next to the title.
        + ✅ Use a different border color (for example blue/green instead of red).
        + ✅ Retain edit/delete icons.
    - Improve Filter/Sort Options:
        + ✅ Add toggle buttons: "All" | "Built-in" | "Custom"
        + ✅ Sort options: "Name", "Type", "Recently Added"
        + ✅ Search functionality that works across both types

- 🔄 Introduce a Profile page accessible via the Profile button on the Settings page. The Profile page should display details such as the user's name (how they like to be called), email address, number of connections/friends (if clicked it would list the connections), from the connections listing clicking/tapping one of the connections would display the connection's profile:
  1. ProfileService StorageService Integration ✅
    - Replaced non-existent getTable() and saveToTable() methods with mock
  implementation
    - Simplified service to return mock data until proper database integration is        
  implemented
    - Removed unused ConnectionStatus import
  2. ProfilePage Component Issues ✅
    - Fixed missing icon imports (MoreHorizontalIcon, UsersIcon, SettingsIcon)
    - Replaced UsersIcon with inline SVG for connections section
    - Removed unused UserStats import and isOwnProfile prop usage
  3. ExercisePage Snackbar Type Errors ✅
    - Fixed showSnackbar calls to use proper options object format
    - Changed from showSnackbar(message, 'success') to showSnackbar(message, { type:     
  'success' })
    - Both success and error snackbar calls now use correct TypeScript signature
  4. Unused Parameters and Variables ✅
    - Added underscore prefix to intentionally unused parameters in ProfileService       
  methods
    - All TypeScript compilation warnings resolved

- ✅ CreateExercise issues:
    - ✅ I created exercise "Ya 7amada 4" which is time-based and I was able to view it in IndexedDB and could also see the edit/delete links on the exercise card on ExercisesPage. A few minutes later after sync was done I was also able to see it in the exercises table in supabase-dev project, but then the edit/delete buttons disappeared on the UI. I think due to a sync bug I lost ownership of the exercise.

- ✅ Scan the entire codebase to replace direct console.log() with logger.log().

- ✅ Favorite button is not shown on the exercise card for custom exercise "Ya 7amada 5". Maybe it is rendered out of border but not visible on screen? This exercise has several buttons: Video play, edit, and delete.

- Custom exercise favorites are not synced from Device A where they were added to Device B where user is authenticated with the same email address.

- ✅ I had a setting on the SettingsPage earlier rep_speed_factor which was a number between 0.5 to 2.0. It is meant to control the video playback speed as a multiplier. So picking 0.5 means playback speed = original speed x 0.5 = slower playback. And the opposite for > 1 which would mean faster playback. This was set on the SettingsPage and used by the Timer to control video playback speed. This is not there on screen anymore. Good to check the history of these 2 pages and see when it was dropped.

- ✅ Don't implement anything until we have refined the requirement and answered design questions. I want to add a feature allowing a user to share the custom exercise they created. Optimally the share link would point to a public page listing the exercise along with its video (if available) without storing anything on the user's device so we don't have to ask for consent. It's okay if we must ask for consent but then the consent dialog should be rendered on top of the page content, not in a previous step. In addition to listing the exercise details there should be some inviting cool text encouraging the user to use RepCue, with a save button that would then prompt the user to sign-up/sign-in. I want suggestions on how to implement this sharing functionality given the following:
  + ✅ User A must be authenticated in order to share exercises
  + ✅ User B may or may not have a RepCue profile
  + S✅ haring might be to an email address, or to anyone who has the link
  + ✅ If sharing to an email address, then supabase database design should cater for both scenarios that user B is an existing RepCue user, or an anonymous one who would claim access to the shared exercise once they authenticate. The authentication flow can start with a Save button. Once authenticated, the shared exercise would then show on the exercise catalog under the "Shared with me" toggle.
  + ✅ The core principle of offline-first must be respected with one exception, the view shared exercise page because I prefer if this page doesn't store anything on the user device to avoid consent banner and streamline the user experience.
 - ✅ I want you to go through the workspace to understand the current implementation and how it can be extended to implement this new feature. Your analysis must include the existing database schemas (indexeddb and supabase), UI elements, screen flows, and any other elements you need to complete the job. Ask me questions if you need to to be able to come up with a complete requirement, design, and implementation plan. Write your final output to docs\implementation-plans\exercise-sharing-implementation-plan.md

- Add feature to allow users to give rating and feedback on the app.

- This is client-side validation for UI rendering. The actual edit/delete operations should also be validated server-side (in the Edge Functions or database policies) for complete security, but the UI-level restriction is working correctly.

- Introduce a server-side validation library to enforce input validation and business rules. The library should be used by the edge functions.

- ✅ Add feature to allow users to invite others to view their own-created exercises. This can be useful for personal trainers to connect with their customers and view their progress.

- Gamification:
    - Add motivational feedback.
    - Add achievements and rewards.
    - Feature to add friends (and view them in the app) - requires registration.
    - Feature to introduce competitions or streaks where two or more users try to achieve some goals (time spent on exercises, frequency of workouts, etc).
    - Share achievements via Share button

- Review all icons in the app and make sure descriptive SVG icons are in place, and replace any emojis with appropriate SVG icons.

- Smart onboarding: Use GenAI to have a chat with the user at the first run with the purpose of creating a workout schedule for them. During this onboarding chat, the AI assistant would ask questions about the user's patterns, goals, injuries, preferences, etc then suggest a workout tailored for them. For example it doesn't make sense to suggest Planks to someone who has a shoulder injury.

- Add error handling to AI instructions, and a log to register one-time fixes.

- ✅ I edited exercise Ya 7amada 6 and successfully uploaded a video that was stored into indexeddb with dirty = 1 then I saved the exercise. I switched tabs to force a sync and the sync was partially successful and I guess the video was not synced because I couldn't find it in supabase. I copied the console output of this full attempt to console.log at the workspace root.


- ✅ The built-in exercise system assumes 3 videos of different resolutions for each exercise, and picks up the relevant version based on the screen dimentions. I am allowing users to upload only one video for custom exercises, and the video system needs to handle that for custom exercises there is only one video. Similar to built-in exercises, the exercise card on ExercisePage should display a play button if the exercise has a video. Also if the custom exercise has a video it should be displayed inside the timer ring, similar to built-in exercises.

- ✅ I uploaded a video to a custom exercise Ya 7amada 5 on Edge browser, and I am trying to see if it sync correctly to Chrome where I am logged on with the same user. The custom exercise itself is synced correctly but not the video. I noticed that in supabase dev project the custom_video_url column is null for my exercise (id = 65b00af8-e9b6-4ec3-b17d-82ef25e56c43) while in my IndexedDB on Edge it has the value "blob-pending-sync://65b00af8-e9b6-4ec3-b17d-82ef25e56c43/BearCrawl_720x576.mp4". On Chrome the value is null in indexeddb. That makes me think that this column is for some reason dropped from the sync. You need to figure out why it is not synced and solve it.

- ✅ I went to Edge where I am logged on and edited exercise Ya 7amada 6 to attach a video then saved the exercise and switched tabs to trigger sync. I copied the console output to file console.log at the root of this workspace. Please examine the log ainst the dev database and determine if the sync was successful. My expectation is that both exercise, exercise_videos, and video_files tables should all be updated as a result of this sync. If that's the sync investigate why it failed. I also need better error handling so when the sync edge function responds that there were 2 push failures I need to know to which tables. There is a lot of room to improve observability for an application like this one that spans across different tiers. For example, I need to be able to corelate the same customer request across the different tiers with one corelation ID. That should improve the investigation of this and future problems.

-✅ I want to rearrange the layout of the exercise card on ExercisePage. I want to make it visually attractive by displaying a frame of the video on the card with the exercise title and action buttons (edit/share/delete/favorite) above the picture (video frame), and below the video frame I want to display the type (time-based/rep-based) and the duration or reps/sets. I am not decided on where to place the "start timer" button and open to suggestions.
Not all exercises have videos so if the exercise doesn't have a video we should use a placeholder image.

- ✅ For the multi-catalog implementation:
  - ✅ Each catalog should have a picture
  - ✅ Each built-in exercise should have additional attributes: benefits, limitations, best_timing, suggested_combinations, notes, references. Example:
```typescript
  createExercise({
    id: 'wall-push-up',
    name: 'Wall Push-Up',
    description: 'Standing push-up against a wall.',
    category: ExerciseCategory.STRENGTH,
    exercise_type: ExerciseType.REPETITION_BASED,
    catalogId: 'women-health',
    default_sets: 3,
    default_reps: 10, // 10–12
    rep_duration_seconds: 2,
    is_favorite: false,
    has_video: false,
    tags: ['upper-body', 'chest', 'arms'],
    benefits: 'Strengthens chest, shoulders, and arms.',
    limitations: 'Avoid with shoulder injuries.',
    best_timing: 'Anytime, even post-meal.',
    suggested_combinations: ['chair-squat', 'desk-plank'],
    notes: 'Gentle option for postpartum women.',
    references: ['NHS Fitness Studio Exercises'],
  })
```
- ✅ Keep track of all the schema migrations, edge functions, and policies applied to the dev project to be later applied to the production project. I would rather keep the production project stable until this feature is fully implemented, and I don't want migrations to be forgotten.

- ✅ I added three catalogs that I want to be part of the implementation: womenHealth.ts, taiChi.ts, and zumba.ts

- ✅ Since this is a PWA it is difficult to force-push new updates to users because pages are cached. I want to introduce a version system maintained in the database and a force-update mechanism linked to the version system. When the PWA comes online during initialization or sync or whatever applicable touchpoint, it would look up the version system in the database, compare the last published version against its local record, and prompt the user for a new version and if it is a mandatory upgrade, it only continues working if the user upgrades.

- ✅ Go over the documentation @docs\implementation-plans\sharing-fix-implementation-plan.md @docs\exercises-sync.md @docs\exercise-sharing.md @docs\video-sync.md @docs\sync.md to understand how the sync system works. If there are contradictions in the documentation it is because each document was written at a different stage of the project, in which case you refer to the implementation to see what the real implementation is and update wrong documentation accordingly.

- ✅ The SettingsPage is made up of multiple sections, e.g. Profile, Audio Settings, Timer Settings, Appearance, etc. There is spacing between each section and the other, and there is spacing between different controls within the same section. Currently this spacing is not consistent. For example there is no spacing between Data and App Updates sections. And there are a few sections where spacing between the controls within the section is not consistent like:
- ✅ The SettingsPage is made up of multiple sections, e.g. Profile, Audio Settings, Timer Settings, Appearance, etc. There is spacing between each section and the other, and there is spacing between different controls within the same section. Currently this spacing is not consistent. For example there is no spacing between Data and App Updates sections. And there are a few sections where spacing between the controls within the section is not consistent like:
- ✅ On the SettingsPage.tsx I want to introduce a new toggle in the Timer Settings section with label Ring Timer and default is On. This toggle should be persisted in indexeddb in app_settings table and should have bidirectional sync to supabase table app_settings. You must write any supabase changes/migrations to workspace first before applying to supabase. This toggle should control how the timer appears on the Timer page. Currently it is a circle and inside it the video is played (if available) while the outside of the circle there are two rings one for rep progress and the other is for reps per current set progress. If the toggle is off then the timer should be rendered in a rectangle (landscape) and video is inside the rectangle (if available) while the outer sides of the rectangle render same progress (progress per rep, rep progress within current set). but of course it is ia rectangle so the progress will take sharp turns along the border.

- ✅ The SettingsPage is made up of multiple sections, e.g. Profile, Audio Settings, Timer Settings, Appearance, etc. There is spacing between each section and the other, and there is spacing between different controls within the same section. Currently this spacing is not consistent. For example there is no spacing between Data and App Updates sections. And there are a few sections where spacing between the controls within the section is not consistent like:
+ ✅ Timer Settings: No space above Ring Timer.
+ ✅ Appearance: No space above "Horizontal Category Listing"
Fix the spacing issue, review the whole  page and implement a consistent spacing strategy.

- ✅ On ExerciseDetailPage.tsx:
+ ✅ When the page loads the navigation starts somewhere down on the page not at the top. When page is opened the navigation should start at the very top of the page (video thumbnail).
+ ✅ Remove the horizontal colored bar at the top of the page below the video thumbnail.
+ ✅ Exercise description should move to the top just below the exercise name, and it should be rendered without the header "Description".
+ ✅ The buttons currently rendered below the exercise name (e.g. time-based/rep-based, core, beginner, private) should be removed completely because they are listed further below on the same page.
+ ✅ The "Start Timer" button should occupy the same line with the "Sign in to copy" button.
+ ✅ "Default Settings" section to be removed, both header and content (e.g. Duration 30s)
+ ✅ Exercise Information has Exercise Type label, that should display the exercise type followed by the duration (e.g. 30s or 3x8 etc) on the same line. And on the same section, the whole Video Demo line should be removed.

- ✅ While on the exercise details page then I click on another exercise link in the suggested combinations section then from the second exercise  I click back I go straight to the exercises listing. The app should track the browsing hierarchy and take me back one step only. If I want to go to th exercises menu I will just      
use the Exercises navigation tab.

- ✅ I did some work in an effort to unify the structure of exercise-related locale files. We had two locale files exercise.json and exercises.json which was confusing. I copied all keys from exercise.json to exercises.json and corrected the how they are read in the different pages. However this doesn't seem to have been done correctly because I see now the exercise details are not localized in many pages in the application. Hence I refactored the exercise-related keys in all locales as such:
+ renamed exercises.json to exerciseDetails.json which now contains the translated string for the individual exercise attributes
+ renamed exercise.json to exercises.json which now contains all the screen labels and enums needed to render exercises on the different pages
Now I need you to go over the application pages and make sure the i18n keys related to exercises are resolved according to this setup.
                                                                                                                                                            
- There is an exercise selector on TimerPage.tsx and also another one on CreateExercisePage.tsx and EditExercisePage.tsx. I don't know if this is the same component reused in different pages, or different implementations of the same logic. If no reusable component exists for choosing an exercise I would like you to create one and use it in these three pages. The exercise selector should offer exceptional user experience that makes it easy to find the desired exercise even when the exercise catalog grows significantly in size into hundreds of exercises. Currently the system offers about 77 exercises and the selector is nothing but a scrollable list. A good selector should cater for the fact that there are different catalogs now, and different categories of exercises (e.g. core, balance, etc). Also should offer toggles like All/Built-in/Custom/Shared with me. Maybe the filter & search component on the ExercisePage.tsx is a good example and maybe it can be reused. However in the three pages I listed (timer/create workout/edit workout) the selection should allow only one exercise not multiple.
I would like you to examine the workspace understand the current implementation, then go over the relevant documentation like ui-specs.md, i18n-guide.md, exercise-catalog.md then create an implementation plan and write it to docs\implementation-plans\exercise-selector-implementation-plan.md. If any of the documentation I mentioned is not accurate according to the current implementation, then update the documentation as well.

- Create exercise selector component and use it in create workout and timer pages.

- We don't need real migration:

// Type for database records during migration - supports both user_id and owner_id
type DatabaseUserFavorite = {}


---

Icons: ☐ ✅ ❌ 👉 🔄 ⏳⌛🚫
