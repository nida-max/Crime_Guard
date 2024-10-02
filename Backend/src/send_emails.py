import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import schedule
import time
from pymongo import MongoClient
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['your_database_name']
user_collection = db['users']
report_collection = db['reports']

# Initialize NLTK
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('wordnet')

def send_emails():
    # Email Configuration
    email_sender = 'nidatariq865@gmail.com'
    email_password = 'your_password'
    smtp_server = 'smtp.gmail.com'
    smtp_port = 587

    # Fetch most repeated area from the database
    most_repeated_area = report_collection.aggregate([
        {"$group": {"_id": "$area", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 1}
    ])

    # Fetch user emails from the database
    users = user_collection.find({}, {"email": 1})
    user_emails = [user['email'] for user in users]

    # NLTK Classification
    # Preprocessing
    lemmatizer = WordNetLemmatizer()
    stop_words = set(stopwords.words('english'))

    def preprocess_text(text):
        tokens = word_tokenize(text.lower())
        tokens = [lemmatizer.lemmatize(token) for token in tokens if token.isalpha()]
        tokens = [token for token in tokens if token not in stop_words]
        return ' '.join(tokens)

    # Get reports for classification
    reports = report_collection.find({}, {"text": 1})
    report_texts = [report['text'] for report in reports]
    report_texts_preprocessed = [preprocess_text(text) for text in report_texts]

    # Feature extraction
    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(report_texts_preprocessed)
    y = [most_repeated_area] * len(X)  # Assuming all reports are classified under most_repeated_area

    # Train a classifier
    classifier = MultinomialNB()
    classifier.fit(X, y)

    # Classify user emails
    user_email_texts = [preprocess_text(email) for email in user_emails]
    user_email_vectorized = vectorizer.transform(user_email_texts)
    predicted_areas = classifier.predict(user_email_vectorized)

    # Email content
    msg = MIMEMultipart()
    msg['From'] = email_sender
    msg['To'] = ', '.join(user_emails)
    msg['Subject'] = 'Important Alert: High Frequency Area Detected'

    body = f"Dear Citizen,\n\nWe have detected a high frequency of reports in the area of {most_repeated_area}. This requires immediate attention and action from our end.\n\nPlease review the situation and take necessary actions to address any underlying issues.\n\nThank you for your cooperation.\n\nBest regards,\nCrime Guard"
    msg.attach(MIMEText(body, 'plain'))

    try:
        # Send emails
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(email_sender, email_password)
        text = msg.as_string()
        server.sendmail(email_sender, user_emails, text)
        print('Emails sent successfully!')
        server.quit()
    except Exception as e:
        print(f'Error sending emails: {str(e)}')

# Schedule the task to run every Monday at 9 AM
schedule.every().monday.at("09:00").do(send_emails)

# Run the scheduler
while True:
    schedule.run_pending()
    time.sleep(60)  # Check every minute if it's time to send emails
