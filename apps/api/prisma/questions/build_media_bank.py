#!/usr/bin/env python3
"""Build media_bank.json + patch awkward Arabic phrasing in bank.json."""

from __future__ import annotations

import json
from pathlib import Path

DIR = Path(__file__).resolve().parent
BANK = DIR / "bank.json"
MEDIA_BANK = DIR / "media_bank.json"

ARABIC_FIXES = {
    "من أخرج فيلم أوريجين / Inception؟": (
        "من أخرج فيلم «أصل» (إينسبشن)؟",
        "Who directed the film Inception?",
    ),
    "أين عُرض مسلسل Squid Game أولاً؟": (
        "أين عُرض مسلسل «لعبة الحبار» لأول مرة؟",
        "Where did Squid Game first premiere?",
    ),
    "ما مسلسل السرطان الكيميائي في Albuquerque؟": (
        "ما اسم مسلسل صناعة المخدرات الشهير في مدينة ألباكركي؟",
        "What is the famous drug-cooking series set in Albuquerque?",
    ),
    "ما مسلسل الشرطة في نيو يورك SVU؟": (
        "ما اسم مسلسل وحدة ضحايا الجرائم الخاصة في نيويورك؟",
        "What is the New York special victims unit police series?",
    ),
    "من مخرج روح بعيدة / Spirited Away؟": (
        "من أخرج فيلم الأنمي «المختطفة» (سبيرتد أواي)؟",
        "Who directed Spirited Away?",
    ),
    "من بطل فيت / Fate الأشهر إيميا؟": (
        "من بطل سلسلة أنمي «فيت» الشهير إيميا؟",
        "Who is the famous Emiya protagonist in Fate?",
    ),
    "من مخرج Your Name؟": (
        "من أخرج فيلم الأنمي «اسمك»؟",
        "Who directed Your Name?",
    ),
    "ما اسم بوابة الخيمياء في FMA؟": (
        "ما اسم قانون التبادل المتكافئ في أنمي كيميائي كامل المعدن؟",
        "What is the equivalent exchange law in Fullmetal Alchemist?",
    ),
    "ما أغنية البيتلز Hey Jude نوع؟": (
        "إلى أي فرقة تنتمي أغنية «هاي جود»؟",
        "Which band performed Hey Jude?",
    ),
    "ما لعبة الـ RPG فاينل فانتسي شركة؟": (
        "أي شركة تصنع سلسلة ألعاب فاينل فانتسي؟",
        "Which company makes Final Fantasy?",
    ),
    "ما لعبة الـ MMORPG وورلد أوف ووركرافت؟": (
        "ما نوع لعبة عالم ووركرافت من حيث أسلوب اللعب الجماعي؟",
        "What kind of multiplayer game is World of Warcraft?",
    ),
    "ما لعبة الـ Battle Pass شائعة في؟": (
        "في أي نوع من الألعاب ينتشر نظام تذكرة الموسم (باتل باس)؟",
        "In which game style is the battle pass common?",
    ),
    "ما لعبة الـ Indie هولونايت؟": (
        "ما أسلوب اللعب الذي تشتهر به لعبة هولو نايت؟",
        "What gameplay style is Hollow Knight known for?",
    ),
    "ما لعبة الـ FPS كاونتر سترايك؟": (
        "ما أسلوب التصويب في لعبة كاونتر سترايك؟",
        "What shooting perspective does Counter-Strike use?",
    ),
    "ما لعبة الـ Souls لايک دارك؟": (
        "بماذا تشتهر ألعاب دارك سولز من حيث الصعوبة؟",
        "What are Dark Souls games known for?",
    ),
    "ما جهاز الـ Game Boy شركة؟": (
        "أي شركة صنعت جهاز جيم بوي؟",
        "Which company made the Game Boy?",
    ),
    "ما لعبة الـ Sandbox روبلوكس؟": (
        "بماذا تُوصف منصة روبلوكس كلعبة؟",
        "How is Roblox best described as a game platform?",
    ),
    "ما رياضة السلة الأمريكية NBA؟": (
        "ما الرياضة التي تنظمها رابطة الـ NBA؟",
        "Which sport does the NBA organize?",
    ),
    "ما رياضة UFC الأشهر؟": (
        "ما الرياضة الأشهر في بطولات الـ UFC؟",
        "Which sport is UFC best known for?",
    ),
    "ما قانون VAR؟": (
        "ماذا يعني نظام حكم الفيديو المساعد في كرة القدم؟",
        "What does VAR mean in football?",
    ),
    "ما شبكة الواي فاي معيار IEEE الشهير؟": (
        "ما رقم معيار شبكة الواي فاي الأشهر من معهد IEEE؟",
        "What is the famous IEEE Wi‑Fi standard number?",
    ),
    "ما شركة صانعة شرائح الرسومات GeForce؟": (
        "أي شركة تصنع شرائح الرسومات المعروفة باسم جي فورس؟",
        "Which company makes GeForce graphics chips?",
    ),
    "ما اختصار USB؟": (
        "ماذا يعني اختصار يو إس بي لأجهزة الحاسوب؟",
        "What does USB stand for?",
    ),
    "ما اختصار GPU؟": (
        "ماذا يعني اختصار وحدة معالجة الرسوميات؟",
        "What does GPU stand for?",
    ),
    "ما معنى WWW؟": (
        "ماذا يعني اختصار الشبكة العالمية WWW؟",
        "What does WWW stand for?",
    ),
}


def q(
    category_id: str,
    points: int,
    ar: str,
    en: str,
    ans_ar: str,
    ans_en: str,
    *,
    qtype: str = "TEXT",
    media_type: str | None = None,
    media_url: str | None = None,
    accepted: list[str] | None = None,
    hint_ar: str | None = None,
    hint_en: str | None = None,
) -> dict:
    difficulty = "EASY" if points <= 200 else "MEDIUM" if points <= 400 else "HARD"
    acc = list(dict.fromkeys([*(accepted or []), ans_ar, ans_en]))
    row: dict = {
        "categoryId": category_id,
        "points": points,
        "difficulty": difficulty,
        "type": qtype,
        "language": "ar",
        "questionTextAr": ar,
        "questionTextEn": en,
        "answerAr": ans_ar,
        "answerEn": ans_en,
        "acceptedAnswers": acc,
    }
    if media_type and media_url:
        row["mediaType"] = media_type
        row["mediaUrl"] = media_url
    if hint_ar:
        row["hintAr"] = hint_ar
    if hint_en:
        row["hintEn"] = hint_en
    return row


def build_media_bank() -> list[dict]:
    out: list[dict] = []

    logos = [
        (200, "ما الشركة صاحبة هذا الشعار؟", "Which company owns this logo?", "آبل", "Apple", "/media/logos/apple-bite.svg", ["أبل", "apple"]),
        (200, "ما العلامة الرياضية صاحبة هذا الشعار؟", "Which sports brand is this?", "نايكي", "Nike", "/media/logos/swoosh.svg", ["نايك", "nike"]),
        (200, "ما سلسلة المطاعم صاحبة هذا الشعار؟", "Which restaurant chain is this?", "ماكدونالدز", "McDonald's", "/media/logos/golden-arches.svg", ["ماكدونالدز", "mcdonalds"]),
        (400, "ما شركة السيارات صاحبة هذا الشعار؟", "Which car brand is this?", "مرسيدس-بنز", "Mercedes-Benz", "/media/logos/three-point-star.svg", ["مرسيدس", "mercedes"]),
        (400, "ما الحدث الرياضي العالمي صاحب هذه الحلقات؟", "Which global event uses these rings?", "الألعاب الأولمبية", "Olympic Games", "/media/logos/rings-five.svg", ["الأولمبياد", "olympics"]),
        (600, "ما الشركة التقنية صاحبة شعار التفاحة المقضومة؟", "Which tech company uses a bitten apple?", "آبل", "Apple", "/media/logos/apple-bite.svg", ["أبل"]),
        (200, "شعار التفاحة يخص أي شركة هواتف؟", "The apple logo belongs to which phone maker?", "آبل", "Apple", "/media/logos/apple-bite.svg", ["أبل"]),
        (400, "شعار القوسين الذهبيين لمطعم أم مشروب؟", "Golden arches: restaurant or drink brand?", "مطعم", "Restaurant", "/media/logos/golden-arches.svg", ["مطاعم", "restaurant"]),
        (600, "كم حلقة في شعار الأولمبياد؟", "How many rings are in the Olympic logo?", "5", "5", "/media/logos/rings-five.svg", ["٥", "خمسة"]),
        (400, "شعار النجمة الثلاثية داخل دائرة لأي شركة؟", "Three-point star in a circle — which brand?", "مرسيدس-بنز", "Mercedes-Benz", "/media/logos/three-point-star.svg", ["مرسيدس"]),
        (200, "شعار «الحركة» المنحنية يخص أي علامة رياضية؟", "The curved swoosh belongs to which brand?", "نايكي", "Nike", "/media/logos/swoosh.svg", ["نايك"]),
        (600, "أي شركة سيارات فاخرة ألمانية يظهر شعارها هنا؟", "Which German luxury car brand is shown?", "مرسيدس-بنز", "Mercedes-Benz", "/media/logos/three-point-star.svg", ["مرسيدس"]),
    ]
    for points, ar, en, aar, aen, url, acc in logos:
        out.append(
            q(
                "logos",
                points,
                ar,
                en,
                aar,
                aen,
                qtype="IMAGE",
                media_type="image",
                media_url=url,
                accepted=acc,
            )
        )

    flags = [
        (200, "علم أي دولة هذا؟", "Which country's flag is this?", "الكويت", "Kuwait", "/media/flags/kuwait.svg", ["كويت"]),
        (200, "علم أي دولة هذا؟", "Which country's flag is this?", "السعودية", "Saudi Arabia", "/media/flags/saudi.svg", ["المملكة العربية السعودية", "saudi"]),
        (200, "علم أي دولة هذا؟", "Which country's flag is this?", "اليابان", "Japan", "/media/flags/japan.svg", ["japan"]),
        (200, "علم أي دولة هذا؟", "Which country's flag is this?", "فرنسا", "France", "/media/flags/france.svg", ["france"]),
        (400, "علم أي دولة خليجية هذا؟", "Which Gulf country flag is this?", "الإمارات", "United Arab Emirates", "/media/flags/uae.svg", ["الإمارات العربية المتحدة", "uae"]),
        (400, "علم أي دولة هذا؟", "Which country's flag is this?", "تركيا", "Turkey", "/media/flags/turkey.svg", ["turkey"]),
        (600, "ما لون الشريط الأسود في علم الكويت؟", "What color is the hoist triangle on Kuwait's flag?", "أسود", "Black", "/media/flags/kuwait.svg", ["الأسود"]),
        (200, "هل يظهر في هذا العلم هلال ونجمة؟", "Does this flag show a crescent and star?", "نعم", "Yes", "/media/flags/turkey.svg", ["yes"]),
        (400, "أي علم فيه دائرة حمراء على خلفية بيضاء؟", "Which flag has a red circle on white?", "اليابان", "Japan", "/media/flags/japan.svg", []),
        (600, "أي علم خليجي يحمل كتابة الشهادتين؟", "Which Gulf flag carries the shahada text?", "السعودية", "Saudi Arabia", "/media/flags/saudi.svg", []),
        (400, "ما ترتيب الألوان الأفقية في علم الإمارات من الأعلى؟", "UAE horizontal colors from top?", "أخضر ثم أبيض ثم أسود", "Green, white, black", "/media/flags/uae.svg", ["أخضر أبيض أسود"]),
        (200, "علم فرنسا كم لوناً عمودياً؟", "How many vertical colors does France's flag have?", "3", "3", "/media/flags/france.svg", ["٣", "ثلاثة"]),
    ]
    for points, ar, en, aar, aen, url, acc in flags:
        out.append(
            q(
                "flags",
                points,
                ar,
                en,
                aar,
                aen,
                qtype="IMAGE",
                media_type="image",
                media_url=url,
                accepted=acc,
            )
        )

    # Songs: mostly strong Arabic text + a few audio demos
    songs = [
        (200, "من لُقّبت بكوكب الشرق؟", "Who was called Planet of the East?", "أم كلثوم", "Umm Kulthum", None, ["ام كلثوم"]),
        (200, "من لُقّب بالعندليب الأسمر؟", "Who was called the Dark Nightingale?", "عبد الحليم حافظ", "Abdel Halim Hafez", None, ["عبدالحليم"]),
        (200, "ما آلة أم كلثوم المصاحبة الأشهر؟", "Which instrument often accompanies Umm Kulthum?", "العود", "Oud", None, ["عود"]),
        (400, "من غنى أغنية «قارئة الفنجان»؟", "Who sang Qariat al-Fingan?", "عبد الحليم حافظ", "Abdel Halim Hafez", None, []),
        (400, "من لُقّب بفنان العرب؟", "Who is known as Artist of the Arabs?", "محمد عبده", "Mohammed Abdu", None, []),
        (400, "ما جنسية الفنانة فيروز؟", "What is Fairuz's nationality?", "لبنانية", "Lebanese", None, ["لبنان"]),
        (600, "من لحن معظم أغاني أم كلثوم المتأخرة مع بليغ حمدي؟", "Who composed many late Umm Kulthum hits with Baligh?", "بليغ حمدي", "Baligh Hamdi", None, []),
        (200, "كم وتراً لقيتارة كلاسيكية عادة؟", "How many strings does a classical guitar usually have?", "6", "6", None, ["٦"]),
        (600, "ما مقام عربي أساسي يبدأ بدرجة الراست؟", "Which Arabic maqam starts on rast?", "مقام الراست", "Maqam Rast", None, ["الراست"]),
        (400, "من غنى «طال الليل» الخليجية الشهيرة؟", "Who sang the famous Gulf song Tal al-Layl?", "عبد الكريم عبد القادر", "Abdulkarim Abdulqader", None, []),
        (200, "استمع للمقطع — ما نوع الوسائط؟", "Listen — what media type is this?", "صوت", "Audio", "/media/samples/melody-hint.wav", ["audio", "مقطع صوتي"]),
        (400, "استمع للنغمة ثم أظهر الجواب: ما اسم الفئة؟", "Listen then reveal: which category is this?", "أغاني", "Songs", "/media/samples/melody-hint.wav", ["songs"]),
    ]
    for points, ar, en, aar, aen, url, acc in songs:
        out.append(
            q(
                "songs",
                points,
                ar,
                en,
                aar,
                aen,
                qtype="AUDIO" if url else "TEXT",
                media_type="audio" if url else None,
                media_url=url,
                accepted=acc,
                hint_ar="ارفع مقاطع أغاني حقيقية من لوحة التحكم لاحقاً" if url else None,
                hint_en="Upload real song clips from admin later" if url else None,
            )
        )

    clips = [
        (200, "في أي برنامج كويتي يُطرح سؤال وجواب بأسلوب سين جيم؟", "Which Kuwaiti show style asks Seen Jeem-style Q&A?", "سين جيم", "Seen Jeem", None, []),
        (200, "ما الرياضة الأشهر لمقاطع «من سجل الهدف»؟", "Which sport is 'who scored' clips about?", "كرة القدم", "Football", None, ["كورة"]),
        (400, "ما منصة المقاطع القصيرة الأشهر عالمياً؟", "What is the most famous short-clip platform?", "تيك توك", "TikTok", None, ["tiktok"]),
        (400, "ما اسم جهاز عرض المباريات على الشاشة الكبيرة في الديوانية غالباً؟", "What do gatherings often use to show match clips?", "التلفاز", "TV", None, ["تلفزيون", "الشاشة"]),
        (600, "لماذا تُستخدم المقاطع في ألعاب التحدي؟", "Why do party trivia games use clips?", "لتخمين المشهد أو اللاعب أو الأغنية", "To guess the scene, player, or song", None, []),
        (200, "هل أسئلة المقاطع تكون نصاً فقط عادة؟", "Are clip questions usually text-only?", "لا", "No", None, ["لا، تكون فيديو"]),
        (400, "ما نوع الوسائط الأنسب لفئة «مقاطع فن خليجي»؟", "Best media for Gulf entertainment clips?", "فيديو", "Video", None, ["video"]),
        (600, "بعد انتهاء المقطع ماذا يفعل المضيف في أسلوب سين جيم؟", "After a clip, what does the Seen Jeem host do?", "يظهر الجواب ثم يحسب النقاط", "Reveal the answer then award points", None, []),
        (200, "ما امتداد ملف فيديو شائع للرفع؟", "A common video upload extension?", "mp4", "mp4", None, ["MP4"]),
        (400, "ما منصة فيديو غوغل الأشهر؟", "Google's famous video platform?", "يوتيوب", "YouTube", None, ["youtube"]),
        (200, "هل يمكن رفع فيديو لسؤال من لوحة التحكم؟", "Can admins attach video to a question?", "نعم", "Yes", None, ["yes"]),
        (600, "ما مدة المقطع المناسبة عادة في ألعاب الديوانية؟", "Typical clip length in party trivia?", "من ١٠ إلى ٣٠ ثانية", "About 10–30 seconds", None, ["قصير"]),
    ]
    for points, ar, en, aar, aen, url, acc in clips:
        out.append(q("clips", points, ar, en, aar, aen, accepted=acc))

    kuwait = [
        (200, "ما عاصمة الكويت؟", "What is the capital of Kuwait?", "الكويت", "Kuwait City", ["مدينة الكويت"]),
        (200, "ما العملة الرسمية في الكويت؟", "What is Kuwait's currency?", "الدينار الكويتي", "Kuwaiti dinar", ["دينار", "د.ك"]),
        (200, "في أي قارة تقع الكويت؟", "Which continent is Kuwait on?", "آسيا", "Asia", []),
        (400, "ما اسم الخليج الذي تطل عليه الكويت؟", "Which gulf does Kuwait face?", "الخليج العربي", "Arabian Gulf", ["الخليج الفارسي"]),
        (400, "ما البرج الأيقوني بثلاث أبراج في الكويت؟", "What is Kuwait's iconic triple tower?", "أبراج الكويت", "Kuwait Towers", []),
        (400, "ما اسم المجلس التشريعي في الكويت؟", "What is Kuwait's parliament called?", "مجلس الأمة", "National Assembly", []),
        (600, "في أي عام نالت الكويت استقلالها تقريباً؟", "Around which year did Kuwait gain independence?", "1961", "1961", ["١٩٦١"]),
        (200, "ما اللغة الرسمية في الكويت؟", "Official language of Kuwait?", "العربية", "Arabic", []),
        (600, "ما اسم الجزيرة الكويتية الأكبر؟", "Kuwait's largest island?", "بوبيان", "Bubiyan", []),
        (400, "ما الزي الرجالي التقليدي الأشهر في الكويت؟", "Traditional men's attire in Kuwait?", "الدشداشة", "Dishdasha", ["ثوب"]),
        (200, "هل الكويت عضوة في مجلس التعاون الخليجي؟", "Is Kuwait in the GCC?", "نعم", "Yes", []),
        (600, "ما اسم الميناء التجاري التاريخي المرتبط بغوص اللؤلؤ؟", "Historic trade linked to pearl diving?", "الغوص على اللؤلؤ", "Pearl diving", ["اللؤلؤ"]),
    ]
    for points, ar, en, aar, aen, acc in kuwait:
        out.append(q("kuwait", points, ar, en, aar, aen, accepted=acc))

    # Keep unique curated rows only (enough for a full board per category)
    return out


def patch_bank_arabic() -> int:
    data = json.loads(BANK.read_text(encoding="utf-8"))
    fixed = 0
    for row in data:
        ar = row.get("questionTextAr", "")
        if ar in ARABIC_FIXES:
            new_ar, new_en = ARABIC_FIXES[ar]
            row["questionTextAr"] = new_ar
            row["questionTextEn"] = new_en
            fixed += 1
    BANK.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return fixed


def main() -> None:
    media = build_media_bank()
    MEDIA_BANK.write_text(json.dumps(media, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    fixed = patch_bank_arabic()
    print(f"Wrote {len(media)} media questions → {MEDIA_BANK.name}")
    print(f"Patched {fixed} awkward Arabic questions in bank.json")


if __name__ == "__main__":
    main()
