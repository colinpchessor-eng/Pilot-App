# **App Name**: FedEx Pilot Application Portal

## Core Features:

- Secure Applicant Login: Authenticate users by matching 'Record Locator' and 'ATP Number' against the Firestore 'applicants' collection, granting access to their unique dashboard upon successful validation.
- Multi-Tab Application Form: Present a tabbed interface for pilots to navigate through different sections of the application form.
- Dynamic Form Data Capture: Collect detailed pilot information across various tabs, including Civilian Multi-Crew flight time (with a 500-hour check), Aircraft Type Ratings (e.g., B-737, G280), and a Safety Questionnaire (Yes/No for incidents/accidents/FAA actions).
- Automatic Data Persistence: Automatically save application data to Firestore in real-time using 'onSnapshot' to prevent data loss.
- Restricted Data Access (Firestore Security): Implement Firestore security rules to allow read/write access only if 'request.resource.data.recordLocator' matches 'resource.data.recordLocator' for a user's specific document.
- Real-time Form Validation: Highlight mandatory fields if users attempt to proceed without completing them.
- PDF Resume Upload: Allow applicants to upload their resume as a PDF, stored in Firebase Storage under a folder named after their ATP number.
- Application Submission & Timestamp: Enable final submission of the application after confirming commitment to the 10-week training syllabus, with an automatic timestamp recorded for the entry.

## Style Guidelines:

- Background Color (main content areas): Clean White (#FFFFFF). A neutral and spacious canvas ensures optimal readability and a modern aesthetic, aligning with professional design standards.
- Primary Color (headers, footer, primary buttons): FedEx Purple (#4D148C). Its deep, authoritative hue communicates professionalism and trust, central to the FedEx brand.
- Accent Color (warning states, apply/submit buttons): FedEx Orange (#FF6200). This vibrant hue creates a high-contrast focal point, drawing attention to critical actions and information.
- Headline and body font: A clean sans-serif font (Inter or Arial) for a modern, objective feel. Headers will be rendered in a bold weight to maintain professionalism and hierarchy.
- A centered login card provides a focused entry point to the application, emphasizing security and direct access.
- A tabbed UI for application sections for efficient organization of the multi-step form.
- Subtle hover effects on buttons to provide clear, tactile feedback, enhancing interactivity without being distracting.