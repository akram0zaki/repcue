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

- Add accounts module, sign-up/sign-in, profile, etc

- I signed up on Firefox where I had Planks, Burpees, and Finger rolls marked as favorites, then I logged on from Edge where I had Burpees and Planks marked as favorites.

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

- Remove the successful sync message "Welcome! Your Data is Safe \n Successfully migrated 35 records from your local storage" if the Debug flag is off. If the sync is not successful then an error should be displayed in a toast indicating that the app is unable to sync with the server.

- ✅ This application is still under development and has no real users yet. I don't mind deleting the entire supabase database and starting over with a clean and clear design to solve this sync issue once and for all. I would like you to be critical and if you think this is a good idea then you need to create a detailed implementation plan with phases and tasks how you would do this step by step  and write it to docs/implementation-plans/sync-resolution.md. Such plan must be thorough and include an analysis of existing indexeddb entities and relations and application functionality to make sure everything is addressed.

- UX improvements:
    - ✅ In the main navigation menu, change the order of pages to be: Home, Exercises, Timer, Workouts, Log, and Settings
    - ✅ On the Home page there is a message with key home.availableExercises under the number of exercises. The number of exercises should be a link that takes the user to the Exercises page, and move this section up to replace the "Browse Exercises" button.
    - ✅ On the Exercises page, replace the categories dropdown menu in the filter with tags similar to how it is rendered in the Activity Log. This would allow the user to choose combinations of categories at a time, rather than just one.
    - ✅ On the Timer page, the timer itself is the main feature and if an exercise has a video the video gets rendered inside the timer's rings. I would like to give the timer rings more space on the page to improve the video visibility (for exercises which have videos), by minimizing the size of other elements on the page and avoiding vertical scrolling. The timer should be rendered in full without the need to scroll vertically on mobile devices.
    - ✅ When browser page becomes visible, sync is initiated and I get a sync result message like this one "Welcome! Your Data is Safe \n Successfully migrated 11 records from your local storage \n Migrated: 5 activity_logs, 3 workout_sessions, 1 user_preferences, and 2 other items". The user takes sync for granted, the successful message should be displayed only if debugging is toggled on in config/features.ts. Otherwise successful sync shouldn't trigger a message and a message should be rendered only if there is a problem.
    - ✅ Bug: When the server is down, the PWA app continues to run in the browser however all strings are displayed as keys (e.g. home.availableExercises) rather than localized text. 
    
- Review all icons in the app and make sure descriptive SVG icons are in place, and replace any emojis with appropriate SVG icons.

- Gamification:
    - Add motivational feedback.
    - Add achievements and rewards.
    - Feature to add friends (and view them in the app) - requires registration.
    - Feature to introduce competitions or streaks where two or more users try to achieve some goals (time spent on exercises, frequency of workouts, etc).
    - Share achievements via Share button

- Add support to create tailored exercises.

- Add feature to allow users to invite others to view their own-created exercises. This can be useful for personal trainers to connect with their customers and view their progress.

- Smart onboarding: Use GenAI to have a chat with the user at the first run with the purpose of creating a workout schedule for them. During this onboarding chat, the AI assistant would ask questions about the user's patterns, goals, injuries, preferences, etc then suggest a workout tailored for them. For example it doesn't make sense to suggest Planks to someone who has a shoulder injury.

---

Icons: ☐ ✅ ❌ 🔄 ⏳⌛👉 🚫