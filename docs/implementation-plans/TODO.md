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

Icons: ☐ ✅ ❌ 🔄 ⏳⌛👉