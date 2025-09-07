from flask import Flask, render_template, request, jsonify, session
import os
import random
import cv2
import dlib
import math
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
import uuid
from collections import deque
from datetime import datetime, timedelta
import base64
from io import BytesIO
from PIL import Image
import logging
from huggingface_hub import login

app = Flask(__name__)
app.secret_key = 'e94c984be9a156848e9d4db164bcdab1'
app.permanent_session_lifetime = timedelta(days=30)

SYLLABLES_DATA = {
    'a': {
        'description': 'Kapag binibigkas ang "A" sound, bumubuka nang malaki ang bibig habang bumababa ang panga, nananatiling mababa at relaxed ang dila, at neutral ang mga labi. Ito ay nagpo-produce ng malinaw na "ah" sound.',
        'gif': '/static/gifs/a.gif',
        'group': 'a_endings'
    },
    'e': {
        'description': 'Kapag binibigkas ang "E" sound, bahagyang bumubuka ang bibig, ang panga ay medyo nakababa, at ang dila ay nasa gitnang posisyon pero nakaangat ng kaunti. Ang mga labi ay bahagyang naka-smile. Ito ay lumilikha ng tunog na "eh," tulad ng sa mesa.',
        'gif': '/static/gifs/e.gif',
        'group': 'e_endings'
    },
    'i': {
        'description': 'Kapag binibigkas ang "I" sound, ang bibig ay medyo nakabukas, ang panga ay hindi masyadong bumababa, at ang dila ay nakaangat patungo sa unahan ng bibig. Ang mga labi ay nakangiti o naka-stretch nang bahagya. Ito ay lumilikha ng malinaw na "ee" sound, tulad ng sa ilaw.',
        'gif': '/static/gifs/i.gif',
        'group': 'i_endings'
    },
    'o': {
        'description': 'Kapag binibigkas ang "O" sound, bumubuka nang bilog ang bibig habang ang panga ay bahagyang bumababa. Ang dila ay nasa gitna at relaxed, at ang mga labi ay malinaw na naka-round. Ito ay nagpo-produce ng "oh" sound, tulad ng sa oso.',
        'gif': '/static/gifs/o.gif',
        'group': 'o_endings'
    },
    'u': {
        'description': 'Kapag binibigkas ang "U" sound, ang bibig ay bumubuka nang maliit at bilog, ang panga ay bahagyang bumababa, at ang dila ay bahagyang nakaangat. Ang mga labi ay naka-pout o naka-round. Ito ay lumilikha ng tunog na "oo," tulad ng sa ubo.',
        'gif': '/static/gifs/u.gif',
        'group': 'u_endings'
    },
    'ba': {
        'description': 'Kapag binibigkas ang "BA," ang bibig ay nagsasara muna dahil sa tunog na "B," at pagkatapos ay bumubuka nang malaki habang bumababa ang panga para sa malinaw na "ah" sound, tulad ng sa bata.',
        'gif': '/static/gifs/ba.gif',
        'group': 'a_endings'
    },
    'be': {
        'description': 'Kapag binibigkas ang "BE," ang bibig ay nagsasara muna para sa tunog na "B," tapos ay bahagyang bumubuka at ang mga labi ay medyo naka-smile habang lumalabas ang "eh" sound, tulad ng sa bebe.',
        'gif': '/static/gifs/be.gif',
        'group': 'e_endings'
    },
    'bi': {
        'description': 'Kapag binibigkas ang "BI," ang bibig ay nagsasara muna para sa tunog na "B," tapos ay bumubuka nang kaunti habang ang dila ay nakaangat at ang mga labi ay naka-stretch, lumilikha ng malinaw na "ee" sound, tulad ng sa biso.',
        'gif': '/static/gifs/bi.gif',
        'group': 'i_endings'
    },
    'bo': {
        'description': 'Kapag binibigkas ang "BO," ang bibig ay nagsasara muna para sa tunog na "B," tapos ay bumubuka at nagiging bilog ang mga labi habang lumalabas ang "oh" sound, tulad ng sa bola.',
        'gif': '/static/gifs/bo.gif',
        'group': 'o_endings'
    },
    'bu': {
        'description': 'Kapag binibigkas ang "BU," ang bibig ay nagsasara muna para sa tunog na "B," tapos ay bumubukas nang kaunti at ang mga labi ay malinaw na naka-round habang lumalabas ang "oo" sound, tulad ng sa buhay.',
        'gif': '/static/gifs/bu.gif',
        'group': 'u_endings'
    },
    'ka': {
        'description': 'Kapag binibigkas ang "KA," ang dila ay nakatukod sa likod na bahagi ng ngalangala (soft palate) para mabuo ang tunog na "K," tapos ay bumubuka nang malaki ang bibig at bumababa ang panga para sa malinaw na "ah" sound, tulad ng sa kaso.',
        'gif': '/static/gifs/ka.gif',
        'group': 'a_endings'
    },
    'ke': {
        'description': 'Kapag binibigkas ang "KE," ang dila ay nakalapat muna sa likod na ngalangala para sa tunog na "K," tapos ay bahagyang bumubuka ang bibig at medyo naka-smile ang labi para lumabas ang "eh" sound, tulad ng sa keso.',
        'gif': '/static/gifs/ke.gif',
        'group': 'e_endings'
    },
    'ki': {
        'description': 'Kapag binibigkas ang "KI," ang dila ay nakalapat muna sa likod ng ngalangala para sa tunog na "K," tapos ay bumubuka nang kaunti ang bibig, ang dila ay umaangat, at ang mga labi ay naka-stretch para makabuo ng malinaw na "ee" sound, tulad ng sa kilo.',
        'gif': '/static/gifs/ki.gif',
        'group': 'i_endings'
    },
    'ko': {
        'description': 'Kapag binibigkas ang "KO," ang dila ay nasa likod ng ngalangala para sa tunog na "K," tapos ay bumubuka ang bibig at nagiging bilog ang mga labi habang lumalabas ang "oh" sound, tulad ng sa koto o kosa.',
        'gif': '/static/gifs/ko.gif',
        'group': 'o_endings'
    },
    'ku': {
        'description': 'Kapag binibigkas ang "KU," ang dila ay nakalapat muna sa likod ng ngalangala para sa tunog na "K," tapos ay bumubuka nang kaunti ang bibig at ang mga labi ay malinaw na naka-round para makabuo ng "oo" sound, tulad ng sa kubo.',
        'gif': '/static/gifs/ku.gif',
        'group': 'u_endings'
    },
    'da': {
        'description': 'Kapag binibigkas ang "DA," ang dila ay dumikit muna sa likod ng ngipin sa itaas para mabuo ang tunog na "D," tapos ay bumubuka nang malaki ang bibig at bumababa ang panga para sa malinaw na "ah" sound, tulad ng sa daga.',
        'gif': '/static/gifs/da.gif',
        'group': 'a_endings'
    },
    'de': {
        'description': 'Kapag binibigkas ang "DE," ang dila ay nakalapat sa likod ng ngipin sa itaas para sa tunog na "D," tapos ay bahagyang bumubuka ang bibig at medyo naka-smile ang labi habang lumalabas ang "eh" sound, tulad ng sa dede.',
        'gif': '/static/gifs/de.gif',
        'group': 'e_endings'
    },
    'di': {
        'description': 'Kapag binibigkas ang "DI," ang dila ay nasa likod ng ngipin sa itaas para mabuo ang tunog na "D," tapos ay bumubuka nang kaunti ang bibig, ang dila ay bahagyang nakaangat, at ang mga labi ay naka-stretch para makabuo ng malinaw na "ee" sound, tulad ng sa dila.',
        'gif': '/static/gifs/di.gif',
        'group': 'i_endings'
    },
    'do': {
        'description': 'Kapag binibigkas ang "DO," ang dila ay nakalapat muna sa likod ng ngipin sa itaas para sa tunog na "D," tapos ay bumubuka ang bibig at nagiging bilog ang mga labi habang lumalabas ang "oh" sound, tulad ng sa dogo o dote.',
        'gif': '/static/gifs/do.gif',
        'group': 'o_endings'
    },
    'du': {
        'description': 'Kapag binibigkas ang "DU," ang dila ay nakalapat muna sa likod ng ngipin sa itaas para sa tunog na "D," tapos ay bumubuka nang kaunti ang bibig at ang mga labi ay malinaw na naka-round para makabuo ng "oo" sound, tulad ng sa dulo.',
        'gif': '/static/gifs/du.gif',
        'group': 'u_endings'
    },
    'ga': {
        'description': 'Kapag binibigkas ang "GA," ang dila ay nakalapat muna sa likod na bahagi ng ngalangala (soft palate) para mabuo ang tunog na "G," tapos ay bumubuka nang malaki ang bibig at bumababa ang panga para sa malinaw na "ah" sound, tulad ng sa gabi.',
        'gif': '/static/gifs/ga.gif',
        'group': 'a_endings'
    },
    'ge': {
        'description': 'Kapag binibigkas ang "GE," ang dila ay nasa likod na ngalangala para sa tunog na "G," tapos ay bahagyang bumubuka ang bibig at medyo naka-smile ang labi habang lumalabas ang "eh" sound, tulad ng sa geysir o gel.',
        'gif': '/static/gifs/ge.gif',
        'group': 'e_endings'
    },
    'gi': {
        'description': 'Kapag binibigkas ang "GI," ang dila ay nakalapat muna sa likod na ngalangala para sa tunog na "G," tapos ay bumubuka nang kaunti ang bibig, ang dila ay bahagyang umaangat, at ang mga labi ay naka-stretch para makabuo ng malinaw na "ee" sound, tulad ng sa gitara.',
        'gif': '/static/gifs/gi.gif',
        'group': 'i_endings'
    },
    'go': {
        'description': 'Kapag binibigkas ang "GO," ang dila ay nasa likod na ngalangala para sa tunog na "G," tapos ay bumubuka ang bibig at nagiging bilog ang labi habang lumalabas ang "oh" sound, tulad ng sa goma.',
        'gif': '/static/gifs/go.gif',
        'group': 'o_endings'
    },
    'gu': {
        'description': 'Kapag binibigkas ang "GU," ang dila ay nasa likod na ngalangala para mabuo ang tunog na "G," tapos ay bumubuka nang kaunti ang bibig at ang mga labi ay malinaw na naka-round para makabuo ng "oo" sound, tulad ng sa gubat.',
        'gif': '/static/gifs/gu.gif',
        'group': 'u_endings'
    },
    'ha': {
        'description': 'Kapag binibigkas ang "HA," ang tunog ay lumalabas dahil sa paghinga palabas, tapos ay bumubuka nang malaki ang bibig at bumababa ang panga para makabuo ng malinaw na "ah" sound, tulad ng sa haba.',
        'gif': '/static/gifs/ha.gif',
        'group': 'a_endings'
    },
    'he': {
        'description': 'Kapag binibigkas ang "HE," nagsisimula sa pagbuga ng hininga, tapos ay bahagyang bumubuka ang bibig at medyo naka-smile ang labi habang lumalabas ang "eh" sound, tulad ng sa helikopter.',
        'gif': '/static/gifs/he.gif',
        'group': 'e_endings'
    },
    'hi': {
        'description': 'Kapag binibigkas ang "HI," nagsisimula rin sa banayad na paghinga palabas, tapos ay bumubuka nang kaunti ang bibig, umaangat ang dila, at naka-stretch ang labi para makabuo ng malinaw na "ee" sound, tulad ng sa hilo.',
        'gif': '/static/gifs/hi.gif',
        'group': 'i_endings'
    },
    'ho': {
        'description': 'Kapag binibigkas ang "HO," may banayad na paghinga palabas, tapos ay bumubuka ang bibig at malinaw na nagiging bilog ang labi habang lumalabas ang "oh" sound, tulad ng sa honey o hora.',
        'gif': '/static/gifs/ho.gif',
        'group': 'o_endings'
    },
    'hu': {
        'description': 'Kapag binibigkas ang "HU," nagsisimula sa pagbuga ng hininga, tapos ay bahagyang bumubuka ang bibig at malinaw na naka-round ang labi para makabuo ng "oo" sound, tulad ng sa huli.',
        'gif': '/static/gifs/hu.gif',
        'group': 'u_endings'
    },
    'la': {
        'description': 'Kapag binibigkas ang "LA," ang dila ay unang dumikit sa likod ng ngipin sa itaas, tapos ay mabilis na bumababa habang bumubuka nang malaki ang bibig at bumababa ang panga para makabuo ng malinaw na "ah" sound, tulad ng sa lawa.',
        'gif': '/static/gifs/la.gif',
        'group': 'a_endings'
    },
    'le': {
        'description': 'Kapag binibigkas ang "LE," ang dila ay dumikit muna sa likod ng ngipin sa itaas, tapos ay babababa habang bahagyang nakabukas ang bibig at medyo naka-smile ang labi para makabuo ng "eh" sound, tulad ng sa lemon.',
        'gif': '/static/gifs/le.gif',
        'group': 'e_endings'
    },
    'li': {
        'description': 'Kapag binibigkas ang "LI," ang dila ay dumikit muna sa likod ng ngipin sa itaas, tapos ay babababa habang bahagyang nakaangat ang dila sa unahan, at naka-stretch ang labi para makabuo ng malinaw na "ee" sound, tulad ng sa lima.',
        'gif': '/static/gifs/li.gif',
        'group': 'i_endings'
    },
    'lo': {
        'description': 'Kapag binibigkas ang "LO," ang dila ay dumikit muna sa likod ng ngipin sa itaas, tapos ay babababa habang bumubuka ang bibig at nagiging bilog ang labi para makabuo ng "oh" sound, tulad ng sa lobo.',
        'gif': '/static/gifs/lo.gif',
        'group': 'o_endings'
    },
    'lu': {
        'description': 'Kapag binibigkas ang "LU," ang dila ay dumikit muna sa likod ng ngipin sa itaas, tapos ay babababa habang bahagyang nakabukas ang bibig at malinaw na naka-round ang labi para makabuo ng "oo" sound, tulad ng sa lupa.',
        'gif': '/static/gifs/lu.gif',
        'group': 'u_endings'
    },
    'ma': {
        'description': 'Kapag binibigkas ang "MA," nagsasara muna ang dalawang labi para mabuo ang tunog na "M," tapos ay bumubuka nang malaki ang bibig at babababa ang panga para makabuo ng malinaw na "ah" sound, tulad ng sa mata.',
        'gif': '/static/gifs/ma.gif',
        'group': 'a_endings'
    },
    'me': {
        'description': 'Kapag binibigkas ang "ME," nagsasara muna ang dalawang labi para sa tunog na "M," tapos ay bahagyang bumubuka ang bibig at medyo naka-smile ang labi para makabuo ng "eh" sound, tulad ng sa mesa.',
        'gif': '/static/gifs/me.gif',
        'group': 'e_endings'
    },
    'mi': {
        'description': 'Kapag binibigkas ang "MI," nagsasara muna ang dalawang labi para sa tunog na "M," tapos ay bumubuka nang kaunti ang bibig, umaangat ang dila, at naka-stretch ang labi para makabuo ng malinaw na "ee" sound, tulad ng sa mismo.',
        'gif': '/static/gifs/mi.gif',
        'group': 'i_endings'
    },
    'mo': {
        'description': 'Kapag binibigkas ang "MO," nagsasara muna ang dalawang labi para sa tunog na "M," tapos ay bumubuka ang bibig at malinaw na nagiging bilog ang labi para makabuo ng "oh" sound, tulad ng sa moto o modelo.',
        'gif': '/static/gifs/mo.gif',
        'group': 'o_endings'
    },
    'mu': {
        'description': 'Kapag binibigkas ang "MU," nagsasara muna ang dalawang labi para sa tunog na "M," tapos ay bumubuka nang kaunti ang bibig at malinaw na naka-round ang labi para makabuo ng "oo" sound, tulad ng sa mundo.',
        'gif': '/static/gifs/mu.gif',
        'group': 'u_endings'
    },
    'na': {
        'description': 'Kapag binibigkas ang "NA," ang dila ay dumikit muna sa likod ng ngipin sa itaas para mabuo ang tunog na "N," tapos ay babababa habang bumubuka nang malaki ang bibig at babababa ang panga para makabuo ng malinaw na "ah" sound, tulad ng sa nasa.',
        'gif': '/static/gifs/na.gif',
        'group': 'a_endings'
    },
    'ne': {
        'description': 'Kapag binibigkas ang "NE," ang dila ay nakalapat muna sa likod ng ngipin sa itaas, tapos ay babababa habang bahagyang nakabukas ang bibig at medyo naka-smile ang labi para makabuo ng "eh" sound, tulad ng sa nene.',
        'gif': '/static/gifs/ne.gif',
        'group': 'e_endings'
    },
    'ni': {
        'description': 'Kapag binibigkas ang "NI," ang dila ay nakalapat muna sa likod ng ngipin sa itaas, tapos ay babababa habang bahagyang nakaangat ang dila at naka-stretch ang labi para makabuo ng malinaw na "ee" sound, tulad ng sa nilo.',
        'gif': '/static/gifs/ni.gif',
        'group': 'i_endings'
    },
    'no': {
        'description': 'Kapag binibigkas ang "NO," ang dila ay nasa likod ng ngipin sa itaas, tapos ay babababa habang bumubuka ang bibig at malinaw na nagiging bilog ang labi para makabuo ng "oh" sound, tulad ng sa nono.',
        'gif': '/static/gifs/no.gif',
        'group': 'o_endings'
    },
    'nu': {
        'description': 'Kapag binibigkas ang "NU," ang dila ay nasa likod ng ngipin sa itaas, tapos ay babababa habang bahagyang nakabukas ang bibig at malinaw na naka-round ang labi para makabuo ng "oo" sound, tulad ng sa nuno.',
        'gif': '/static/gifs/nu.gif',
        'group': 'u_endings'
    },
    'nga': {
        'description': 'Kapag binibigkas ang "NGA," ang tunog ay nagsisimula sa likod ng lalamunan habang nakarelax ang dila sa likod, tapos ay bumubuka nang malaki ang bibig at babababa ang panga para makabuo ng malinaw na "ah" sound, tulad ng sa nganga.',
        'gif': '/static/gifs/nga.gif',
        'group': 'a_endings'
    },
    'nge': {
        'description': 'Kapag binibigkas ang "NGE," nagsisimula ang tunog sa likod ng lalamunan habang nakaposisyon ang dila sa likod, tapos ay bahagyang bumubuka ang bibig at medyo naka-smile ang labi para makabuo ng "eh" sound, tulad ng sa ngeso.',
        'gif': '/static/gifs/nge.gif',
        'group': 'e_endings'
    },
    'ngi': {
        'description': 'Kapag binibigkas ang "NGI," nagsisimula ang tunog sa likod ng lalamunan, tapos ay bumubuka nang kaunti ang bibig, umaangat ang dila, at naka-stretch ang labi para makabuo ng malinaw na "ee" sound, tulad ng sa ngipin.',
        'gif': '/static/gifs/ngi.gif',
        'group': 'i_endings'
    },
    'ngo': {
        'description': 'Kapag binibigkas ang "NGO," nagsisimula ang tunog sa likod ng lalamunan, tapos ay bumubuka ang bibig at malinaw na nagiging bilog ang labi para makabuo ng "oh" sound, tulad ng sa ngongo.',
        'gif': '/static/gifs/ngo.gif',
        'group': 'o_endings'
    },
    'ngu': {
        'description': 'Kapag binibigkas ang "NGU," nagsisimula rin sa likod ng lalamunan, tapos ay bahagyang bumubuka ang bibig at malinaw na naka-round ang labi para makabuo ng "oo" sound, tulad ng sa nguso.',
        'gif': '/static/gifs/ngu.gif',
        'group': 'u_endings'
    },
    'pa': {
        'description': 'Kapag binibigkas ang "PA," ang dalawang labi ay nagsasara muna para sa tunog na "P," tapos ay bumubuka nang malaki ang bibig at babababa ang panga para makabuo ng malinaw na "ah" sound, tulad ng sa pasa.',
        'gif': '/static/gifs/pa.gif',
        'group': 'a_endings'
    },
    'pe': {
        'description': 'Kapag binibigkas ang "PE," ang dalawang labi ay nagsasara muna para sa tunog na "P," tapos ay bahagyang bumubuka ang bibig at medyo naka-smile ang labi para makabuo ng "eh" sound, tulad ng sa pera.',
        'gif': '/static/gifs/pe.gif',
        'group': 'e_endings'
    },
    'pi': {
        'description': 'Kapag binibigkas ang "PI," ang dalawang labi ay nagsasara muna para sa tunog na "P," tapos ay bumubuka nang kaunti ang bibig, umaangat ang dila, at naka-stretch ang labi para makabuo ng malinaw na "ee" sound, tulad ng sa piso.',
        'gif': '/static/gifs/pi.gif',
        'group': 'i_endings'
    },
    'po': {
        'description': 'Kapag binibigkas ang "PO," ang dalawang labi ay nagsasara muna para sa tunog na "P," tapos ay bumubuka ang bibig at malinaw na nagiging bilog ang labi para makabuo ng "oh" sound, tulad ng sa pogi.',
        'gif': '/static/gifs/po.gif',
        'group': 'o_endings'
    },
    'pu': {
        'description': 'Kapag binibigkas ang "PU," ang dalawang labi ay nagsasara muna para sa tunog na "P," tapos ay bahagyang bumubuka ang bibig at malinaw na naka-round ang labi para makabuo ng "oo" sound, tulad ng sa puno.',
        'gif': '/static/gifs/pu.gif',
        'group': 'u_endings'
    },
    'ra': {
        'description': 'Kapag binibigkas ang "RA," ang dila ay bahagyang tumatama o nagvi-vibrate malapit sa itaas na ngipin o sa gitna ng ngalangala para mabuo ang tunog na "R," tapos ay bumubuka nang malaki ang bibig at babababa ang panga para makabuo ng malinaw na "ah" sound, tulad ng sa rama.',
        'gif': '/static/gifs/ra.gif',
        'group': 'a_endings'
    },
    're': {
        'description': 'Kapag binibigkas ang "RE," ang dila ay bahagyang tumatama sa itaas na ngipin o ngalangala para sa tunog na "R," tapos ay bahagyang bumubuka ang bibig at medyo naka-smile ang labi para makabuo ng "eh" sound, tulad ng sa rehistro.',
        'gif': '/static/gifs/re.gif',
        'group': 'e_endings'
    },
    'ri': {
        'description': 'Kapag binibigkas ang "RI," ang dila ay dumidikit o nagvi-vibrate nang bahagya malapit sa itaas na ngipin o ngalangala, tapos ay bumubuka nang kaunti ang bibig, umaangat ang dila, at naka-stretch ang labi para makabuo ng malinaw na "ee" sound, tulad ng sa rima.',
        'gif': '/static/gifs/ri.gif',
        'group': 'i_endings'
    },
    'ro': {
        'description': 'Kapag binibigkas ang "RO," ang dila ay nasa posisyon ng "R" sa itaas na bahagi ng bibig, tapos ay bumubuka ang bibig at malinaw na nagiging bilog ang labi para makabuo ng "oh" sound, tulad ng sa ropa.',
        'gif': '/static/gifs/ro.gif',
        'group': 'o_endings'
    },
    'ru': {
        'description': 'Kapag binibigkas ang "RU," ang dila ay nasa posisyon ng "R" malapit sa itaas na ngipin o ngalangala, tapos ay bahagyang bumubuka ang bibig at malinaw na naka-round ang labi para makabuo ng "oo" sound, tulad ng sa ruso.',
        'gif': '/static/gifs/ru.gif',
        'group': 'u_endings'
    },
    'sa': {
        'description': 'Kapag binibigkas ang "SA," ang dila ay nakaposisyon malapit sa ngipin sa itaas para makalikha ng tunog na parang hangin na lumalabas ("S"), tapos ay bumubuka nang malaki ang bibig at babababa ang panga para makabuo ng malinaw na "ah" sound, tulad ng sa sama.',
        'gif': '/static/gifs/sa.gif',
        'group': 'a_endings'
    },
    'se': {
        'description': 'Kapag binibigkas ang "SE," nagsisimula sa tunog na "S" kung saan ang dila ay malapit sa ngipin sa itaas, tapos ay bahagyang bumubuka ang bibig at medyo naka-smile ang labi para makabuo ng "eh" sound, tulad ng sa sebo.',
        'gif': '/static/gifs/se.gif',
        'group': 'e_endings'
    },
    'si': {
        'description': 'Kapag binibigkas ang "SI," ang tunog na "S" ay nagmumula sa hangin na lumalabas sa pagitan ng dila at ngipin, tapos ay bumubuka nang kaunti ang bibig, umaangat ang dila, at naka-stretch ang labi para makabuo ng malinaw na "ee" sound, tulad ng sa sisiw.',
        'gif': '/static/gifs/si.gif',
        'group': 'i_endings'
    },
    'so': {
        'description': 'Kapag binibigkas ang "SO," nagsisimula sa tunog na "S," tapos ay bumubuka ang bibig at malinaw na nagiging bilog ang labi para makabuo ng "oh" sound, tulad ng sa sopa.',
        'gif': '/static/gifs/so.gif',
        'group': 'o_endings'
    },
    'su': {
        'description': 'Kapag binibigkas ang "SU," nagsisimula sa tunog na "S," tapos ay bahagyang bumubuka ang bibig at malinaw na naka-round ang labi para makabuo ng "oo" sound, tulad ng sa suso.',
        'gif': '/static/gifs/su.gif',
        'group': 'u_endings'
    },
    'ta': {
        'description': 'Kapag binibigkas ang "TA," ang dila ay dumikit muna sa likod ng ngipin sa itaas para makabuo ng tunog na "T," tapos ay bumubuka nang malaki ang bibig at babababa ang panga para makabuo ng malinaw na "ah" sound, tulad ng sa tata.',
        'gif': '/static/gifs/ta.gif',
        'group': 'a_endings'
    },
    'te': {
        'description': 'Kapag binibigkas ang "TE," nagsisimula sa tunog na "T" kung saan ang dila ay nasa likod ng ngipin sa itaas, tapos ay bahagyang bumubuka ang bibig at medyo naka-smile ang labi para makabuo ng "eh" sound, tulad ng sa tema.',
        'gif': '/static/gifs/te.gif',
        'group': 'e_endings'
    },
    'ti': {
        'description': 'Kapag binibigkas ang "TI," ang dila ay nakalapat sa likod ng ngipin sa itaas para sa tunog na "T," tapos ay bumubuka nang kaunti ang bibig, umaangat ang dila, at naka-stretch ang labi para makabuo ng malinaw na "ee" sound, tulad ng sa tila.',
        'gif': '/static/gifs/ti.gif',
        'group': 'i_endings'
    },
    'to': {
        'description': 'Kapag binibigkas ang "TO," nagsisimula sa tunog na "T" mula sa dila na nakadikit sa likod ng ngipin sa itaas, tapos ay bumubuka ang bibig at malinaw na nagiging bilog ang labi para makabuo ng "oh" sound, tulad ng sa totoo.',
        'gif': '/static/gifs/to.gif',
        'group': 'o_endings'
    },
    'tu': {
        'description': 'Kapag binibigkas ang "TU," ang dila ay nasa likod ng ngipin sa itaas para sa tunog na "T," tapos ay bahagyang bumubuka ang bibig at malinaw na naka-round ang labi para makabuo ng "oo" sound, tulad ng sa tubo.',
        'gif': '/static/gifs/tu.gif',
        'group': 'u_endings'
    },
    'wa': {
        'description': 'Kapag binibigkas ang "WA," ang mga labi ay unang nagro-round para sa tunog na "W," tapos ay bumubuka nang malaki ang bibig at babababa ang panga para makabuo ng malinaw na "ah" sound.',
        'gif': '/static/gifs/wa.gif',
        'group': 'a_endings'
    },
    'we': {
        'description': 'Kapag binibigkas ang "WE," ang mga labi ay nagsisimula sa rounded position para sa tunog na "W," tapos ay bahagyang bumubuka ang bibig at medyo naka-smile ang labi para makabuo ng "eh" sound.',
        'gif': '/static/gifs/we.gif',
        'group': 'e_endings'
    },
    'wi': {
        'description': 'Kapag binibigkas ang "WI," ang mga labi ay nagiging bilog muna para sa tunog na "W," tapos ay bumubuka nang kaunti ang bibig, umaangat ang dila, at naka-stretch ang labi para makabuo ng malinaw na "ee" sound.',
        'gif': '/static/gifs/wi.gif',
        'group': 'i_endings'
    },
    'wo': {
        'description': 'Kapag binibigkas ang "WO," nagsisimula ang labi sa bilog na posisyon para sa "W," tapos ay bumubuka pa nang mas malaki at nananatiling bilog ang labi para makabuo ng "oh" sound.',
        'gif': '/static/gifs/wo.gif',
        'group': 'o_endings'
    },
    'wu': {
        'description': 'Kapag binibigkas ang "WU," ang labi ay malinaw na naka-round para sa tunog na "W," tapos ay bahagyang bumubuka at nananatiling bilog para makabuo ng "oo" sound.',
        'gif': '/static/gifs/wu.gif',
        'group': 'u_endings'
    },
    'ya': {
        'description': 'Kapag binibigkas ang "YA," ang dila ay bahagyang nakaangat sa unahan ng bibig at ang labi ay medyo naka-stretch para sa tunog na "Y," tapos ay bumubuka nang malaki ang bibig at babababa ang panga para makabuo ng malinaw na "ah" sound.',
        'gif': '/static/gifs/ya.gif',
        'group': 'a_endings'
    },
    'ye': {
        'description': 'Kapag binibigkas ang "YE," ang dila ay nasa unahan ng bibig para sa tunog na "Y," tapos ay bahagyang bumubuka ang bibig at medyo naka-smile ang labi para makabuo ng "eh" sound.',
        'gif': '/static/gifs/ye.gif',
        'group': 'e_endings'
    },
    'yi': {
        'description': 'Kapag binibigkas ang "YI," nagsisimula sa tunog na "Y" kung saan nakaangat ang dila sa unahan, tapos ay bumubuka nang kaunti ang bibig at naka-stretch ang labi para makabuo ng malinaw na "ee" sound.',
        'gif': '/static/gifs/yi.gif',
        'group': 'i_endings'
    },
    'yo': {
        'description': 'Kapag binibigkas ang "YO," ang dila ay nasa unahan ng bibig para sa tunog na "Y," tapos ay bumubuka ang bibig at nagiging bilog ang labi para makabuo ng "oh" sound.',
        'gif': '/static/gifs/yo.gif',
        'group': 'o_endings'
    },
    'yu': {
        'description': 'Kapag binibigkas ang "YU," nagsisimula sa tunog na "Y" habang nakaangat ang dila sa unahan, tapos ay bahagyang bumubuka ang bibig at malinaw na naka-round ang labi para makabuo ng "oo" sound.',
        'gif': '/static/gifs/yu.gif',
        'group': 'u_endings'
    },
}
WORDS_DATA = {
    "aba": {"gif": "/static/gifs/words/aba.gif", "group": "a_sound"},
    "abo": {"gif": "/static/gifs/words/abo.gif", "group": "o_sound"},
    "awa": {"gif": "/static/gifs/words/awa.gif", "group": "a_sound"},
    "baga": {"gif": "/static/gifs/words/baga.gif", "group": "a_sound"},
    "bawi": {"gif": "/static/gifs/words/bawi.gif", "group": "i_sound"},
    "buti": {"gif": "/static/gifs/words/buti.gif", "group": "u_sound"},
    "dati": {"gif": "/static/gifs/words/dati.gif", "group": "i_sound"},
    "dulo": {"gif": "/static/gifs/words/dulo.gif", "group": "o_sound"},
    "diwa": {"gif": "/static/gifs/words/diwa.gif", "group": "a_sound"},
    "gawa": {"gif": "/static/gifs/words/gawa.gif", "group": "a_sound"},
    "gisa": {"gif": "/static/gifs/words/gisa.gif", "group": "a_sound"},
    "gulo": {"gif": "/static/gifs/words/gulo.gif", "group": "o_sound"},
    "haba": {"gif": "/static/gifs/words/haba.gif", "group": "a_sound"},
    "hilo": {"gif": "/static/gifs/words/hilo.gif", "group": "o_sound"},
    "hula": {"gif": "/static/gifs/words/hula.gif", "group": "u_sound"},
    "iba": {"gif": "/static/gifs/words/iba.gif", "group": "a_sound"},
    "kami": {"gif": "/static/gifs/words/kami.gif", "group": "i_sound"},
    "kape": {"gif": "/static/gifs/words/kape.gif", "group": "e_sound"},
    "kusa": {"gif": "/static/gifs/words/kusa.gif", "group": "u_sound"},
    "laro": {"gif": "/static/gifs/words/laro.gif", "group": "o_sound"},
    "ligo": {"gif": "/static/gifs/words/ligo.gif", "group": "o_sound"},
    "luma": {"gif": "/static/gifs/words/luma.gif", "group": "a_sound"},
    "mapa": {"gif": "/static/gifs/words/mapa.gif", "group": "a_sound"},
    "misa": {"gif": "/static/gifs/words/misa.gif", "group": "a_sound"},
    "mula": {"gif": "/static/gifs/words/mula.gif", "group": "a_sound"},
    "nasa": {"gif": "/static/gifs/words/nasa.gif", "group": "a_sound"},
    "nawa": {"gif": "/static/gifs/words/nawa.gif", "group": "a_sound"},
    "nito": {"gif": "/static/gifs/words/nito.gif", "group": "o_sound"},
    "ngiti": {"gif": "/static/gifs/words/ngiti.gif", "group": "i_sound"},
    "nguya": {"gif": "/static/gifs/words/nguya.gif", "group": "u_sound"},
    "oo": {"gif": "/static/gifs/words/oo.gif", "group": "o_sound"},
    "paa": {"gif": "/static/gifs/words/paa.gif", "group": "a_sound"},
    "piso": {"gif": "/static/gifs/words/piso.gif", "group": "o_sound"},
    "puti": {"gif": "/static/gifs/words/puti.gif", "group": "u_sound"},
    "rito": {"gif": "/static/gifs/words/rito.gif", "group": "o_sound"},
    "ruta": {"gif": "/static/gifs/words/ruta.gif", "group": "a_sound"},
    "relo": {"gif": "/static/gifs/words/relo.gif", "group": "e_sound"},
    "sabi": {"gif": "/static/gifs/words/sabi.gif", "group": "i_sound"},
    "sako": {"gif": "/static/gifs/words/sako.gif", "group": "o_sound"},
    "sino": {"gif": "/static/gifs/words/sino.gif", "group": "o_sound"},
    "tabi": {"gif": "/static/gifs/words/tabi.gif", "group": "i_sound"},
    "tago": {"gif": "/static/gifs/words/tago.gif", "group": "o_sound"},
    "tula": {"gif": "/static/gifs/words/tula.gif", "group": "a_sound"},
    "uso": {"gif": "/static/gifs/words/uso.gif", "group": "o_sound"},
    "wala": {"gif": "/static/gifs/words/wala.gif", "group": "a_sound"},
    "wika": {"gif": "/static/gifs/words/wika.gif", "group": "i_sound"},
    "walo": {"gif": "/static/gifs/words/walo.gif", "group": "o_sound"},
    "yaya": {"gif": "/static/gifs/words/yaya.gif", "group": "a_sound"},
    "yelo": {"gif": "/static/gifs/words/yelo.gif", "group": "e_sound"},
    "yoyo": {"gif": "/static/gifs/words/yoyo.gif", "group": "o_sound"}
}


CHALLENGE_GROUPS = {
    'a_endings': ['a', 'ba', 'da', 'ka', 'ga', 'ha', 'la', 'ma', 'na', 'nga', 'pa', 'ra', 'sa', 'ta', 'wa', 'ya'],
    'e_endings': ['e', 'be', 'de', 'ke', 'ge', 'he', 'le', 'me', 'ne', 'nge', 'pe', 're', 'se', 'te', 'we', 'ye'],
    'i_endings': ['i', 'bi', 'di', 'ki', 'gi', 'hi', 'li', 'mi', 'ni', 'ngi', 'pi', 'ri', 'si', 'ti', 'wi', 'yi'],
    'o_endings': ['o', 'bo', 'do', 'ko', 'go', 'ho', 'lo', 'mo', 'no', 'ngo', 'po', 'ro', 'so', 'to', 'wo', 'yo'],
    'u_endings': ['u', 'bu', 'du', 'ku', 'gu', 'hu', 'lu', 'mu', 'nu', 'ngu', 'pu', 'ru', 'su', 'tu', 'wu', 'yu'],
    'a_sound': [
        "aba", "awa", "baga", "gawa", "haba", "iba", "mapa", "mula", "nasa", "nawa",
        "paa", "ruta", "tula", "wala", "yaya","luma","kape", "dati", "diwa", "gisa", 
        "kami", "misa","sabi", "tabi", "wika","bawi","abo", "laro", "sako","tago",
        "walo","hula", "kusa", "nguya", "mula", "ruta", "tula","luma","diwa"
    ],
    'e_sound': [
        "kape", "relo", "yelo"
    ],
    'i_sound': [
        "buti", "dati", "diwa", "gisa", "kami", "misa", "ngiti", "puti", "rito",
        "sabi", "sino", "tabi", "wika","bawi", "iba", "hilo", "ligo", "nito", "piso"
    ],
    'o_sound': [
        "abo", "dulo", "gulo", "hilo", "laro", "ligo", "nito", "oo", "piso", "sako",
        "tago", "uso", "walo", "yoyo", "relo", "yelo", "sino"
    ],
    'u_sound': [
        "hula", "kusa", "nguya", "mula", "ruta", "tula","luma","buti", "diwa", "puti",
        "rito", "dulo", "gulo", "uso", "walo"
    ]

}


# Model configurations
MODEL_CONFIGS = {
    'vowels': {
        'model_path': 'projectlif/lipreading-models/model/model_v.h5',
        'classes': ['a', 'e', 'i', 'o', 'u']
    },
    'b': {
        'model_path': 'projectlif/lipreading-models/model/model_b.h5',
        'classes': ['ba', 'be', 'bi', 'bo', 'bu']
    },
    'k': {
        'model_path': 'projectlif/lipreading-models/model/model_k.h5',
        'classes': ['ka', 'ke', 'ki', 'ko', 'ku']
    },
    'd': {
        'model_path': 'projectlif/lipreading-models/model/model_d.h5',
        'classes': ['da', 'de', 'di', 'do', 'du']
    },
    'g': {
        'model_path': 'projectlif/lipreading-models/tree/main/model/model_g.h5',
        'classes': ['ga', 'ge', 'gi', 'go', 'gu']
    },
    'h': {
        'model_path': 'projectlif/lipreading-models/model/model_h.h5',
        'classes': ['ha', 'he', 'hi', 'ho', 'hu']
    },
    'l': {
        'model_path': 'projectlif/lipreading-models/model/model_l.h5',
        'classes': ['la', 'le', 'li', 'lo', 'lu']
    },
    'm': {
        'model_path': 'projectlif/lipreading-models/model/model_m.h5',
        'classes': ['ma', 'me', 'mi', 'mo', 'mu']
    },
    'n': {
        'model_path': 'projectlif/lipreading-models/model/model_n.h5',
        'classes': ['na', 'ne', 'ni', 'no', 'nu']
    },
    'ng': {
        'model_path': 'projectlif/lipreading-models/model/model_ng.h5',
        'classes': ['nga', 'nge', 'ngi', 'ngo', 'ngu']
    },
    'p': {
        'model_path': 'projectlif/lipreading-models/model/model_p.h5',
        'classes': ['pa', 'pe', 'pi', 'po', 'pu']
    },
    'r': {
        'model_path': 'projectlif/lipreading-models/model/model_r.h5',
        'classes': ['ra', 're', 'ri', 'ro', 'ru']
    },
    's': {
        'model_path': 'projectlif/lipreading-models/model/model_s.h5',
        'classes': ['sa', 'se', 'si', 'so', 'su']
    },
    't': {
        'model_path': 'projectlif/lipreading-models/model/model_t.h5',
        'classes': ['ta', 'te', 'ti', 'to', 'tu']
    },
    'w': {
        'model_path': 'projectlif/lipreading-models/model/model_w.h5',
        'classes': ['wa', 'we', 'wi', 'wo', 'wu']
    },
    'y': {
        'model_path': 'projectlif/lipreading-models/model/model_y.h5',
        'classes': ['ya', 'ye', 'yi', 'yo', 'yu']
    },
    'words': {
        'model_path': 'projectlif/lipreading-models/model/model50words.h5',
        'classes': [
            "aba", "abo", "awa", "baga", "bawi", "buti", "dati", "dulo", "diwa", "gawa", "gisa", "gulo", "haba", "hilo", "hula", "iba", "kami", "kape", "kusa", "laro", "ligo", "luma", "mapa", "misa", "mula", "nasa", "nawa", "nito", "ngiti", "nguya", "oo", "paa", "piso", "puti", "rito", "ruta", "relo", "sabi", "sako", "sino", "tabi", "tago", "tula", "uso", "wala", "wika", "walo", "yaya", "yelo", "yoyo"

        ]
    }
}

SYLLABLE_ORDER = ["a", "e", "i", "o", "u", "ba", "be", "bi", "bo", "bu", "ka", "ke", "ki", "ko", "ku", "da", "de", "di",
             "do", "du", "ga", "ge", "gi", "go", "gu", "ha", "he", "hi", "ho", "hu", "la", "le", "li", "lo", "lu", "ma",
             "me", "mi", "mo", "mu", "na", "ne", "ni", "no", "nu", "nga", "nge", "ngi", "ngo", "ngu", "pa", "pe", "pi",
             "po", "pu", "ra", "re", "ri", "ro", "ru", "sa", "se", "si", "so", "su", "ta", "te", "ti", "to", "tu", "wa",
             "we", "wi", "wo", "wu", "ya", "ye", "yi", "yo", "yu"]

@app.before_request
def before_request():
    session.permanent = True
    
    # Generate unique session ID if not exists
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        session['created_at'] = datetime.now().isoformat()
        session['total_sessions'] = 1
        session['current_session_start'] = datetime.now().isoformat()
        session['page_visits'] = 0
    
    # Only increment page visits, not sessions
    if request.endpoint and request.endpoint not in ['static', 'get_session_info']:
        session['page_visits'] = session.get('page_visits', 0) + 1


@app.route('/api/session/info')
def get_session_info():
    show_welcome = session.get('welcome_shown', False)
    if not show_welcome:
        session['welcome_shown'] = True
    
    return jsonify({
        'user_id': session.get('user_id'),
        'created_at': session.get('created_at'),
        'total_sessions': session.get('total_sessions', 1),
        'page_visits': session.get('page_visits', 0),
        'show_welcome': not show_welcome,
        'is_new_user': session.get('total_sessions', 1) == 1
    })


def get_next_syllable(current_syllable):
    """Get the next syllable in the learning sequence"""
    try:
        current_index = SYLLABLE_ORDER.index(current_syllable)
        if current_index < len(SYLLABLE_ORDER) - 1:
            return SYLLABLE_ORDER[current_index + 1]
        else:
            return None  # Last syllable, no next
    except ValueError:
        return None  # Syllable not found



def get_previous_syllable(current_syllable):
    """Get the previous syllable in the learning sequence"""
    try:
        current_index = SYLLABLE_ORDER.index(current_syllable)
        if current_index > 0:
            return SYLLABLE_ORDER[current_index - 1]
        else:
            return None  # First syllable, no previous
    except ValueError:
        return None  # Syllable not found



def get_syllable_index(syllable):
    """Get the current index of syllable in the sequence"""
    try:
        return SYLLABLE_ORDER.index(syllable)
    except ValueError:
        return 0


@app.route('/api/syllable/<syllable>/master', methods=['POST'])
def master_syllable(syllable):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'No session found'}), 400
        
        # Get current mastered syllables from session
        mastered = session.get('mastered_syllables', [])
        
        if syllable not in mastered:
            mastered.append(syllable)
            session['mastered_syllables'] = mastered
            
            # Also update points
            current_points = session.get('total_points', 0)
            session['total_points'] = current_points + 100
            
            return jsonify({
                'success': True,
                'message': f'Syllable {syllable} mastered!',
                'total_mastered': len(mastered),
                'points_earned': 100,
                'total_points': session['total_points']
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Syllable already mastered'
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


        
@app.route('/api/quiz/save-score', methods=['POST'])
def save_quiz_score():
    try:
        data = request.get_json()
        user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'No session found'}), 400
        
        # Get current high scores (keep top 3)
        high_scores = session.get('quiz_high_scores', [])
        
        new_score = {
            'score': data.get('score', 0),
            'accuracy': data.get('accuracy', 0),
            'date': datetime.now().isoformat(),
        }
        
        high_scores.append(new_score)
        
        # Sort by score descending
        high_scores.sort(key=lambda x: x['score'], reverse=True)
        
        # Keep only top 3
        session['quiz_high_scores'] = high_scores[:3]
        
        # Correct high score check (compare against best score after slicing)
        is_new_high_score = (
            len(session['quiz_high_scores']) == 1 or
            new_score['score'] >= session['quiz_high_scores'][0]['score']
        )
        
        return jsonify({
            'success': True,
            'high_scores': session['quiz_high_scores'],
            'is_new_high_score': is_new_high_score
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/api/word-quiz/save-score', methods=['POST'])
def save_word_quiz_score():
    try:
        data = request.get_json()
        user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'No session found'}), 400
        
        # Get current high scores (keep top 3)
        high_scores = session.get('word_quiz_high_scores', [])
        
        new_score = {
            'score': data.get('score', 0),
            'accuracy': data.get('accuracy', 0),
            'date': datetime.now().isoformat(),
        }
        
        high_scores.append(new_score)
        
        # Sort by score descending
        high_scores.sort(key=lambda x: x['score'], reverse=True)
        
        # Keep only top 3
        session['word_quiz_high_scores'] = high_scores[:3]
        
        # Check if new high score (after slicing)
        is_new_high_score = (
            len(session['word_quiz_high_scores']) == 1 or
            new_score['score'] >= session['word_quiz_high_scores'][0]['score']
        )
        
        return jsonify({
            'success': True,
            'high_scores': session['word_quiz_high_scores'],
            'is_new_high_score': is_new_high_score
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/api/progress/get')
def get_progress():
    user_id = session.get('user_id')
    
    return jsonify({
        'user_id': user_id,
        'mastered_syllables': session.get('mastered_syllables', []),
        'total_points': session.get('total_points', 0),
        'quiz_high_scores': session.get('quiz_high_scores', []),
        'session_info': {
            'created_at': session.get('created_at'),
            'total_sessions': session.get('total_sessions', 1),
            'page_visits': session.get('page_visits', 0)
        }
    })

@app.route('/api/progress/sync', methods=['POST'])
def sync_progress():
    try:
        data = request.get_json()
        user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'No session found'}), 400

        progress_data = {
            'user_id': user_id,
            'completed': data.get('completed', []),
            'points': data.get('points', 0),
            'total_time': data.get('total_time', 0),
            'last_updated': datetime.now().isoformat()
        }
        
        session['progress'] = progress_data
        
        return jsonify({
            'success': True,
            'message': 'Progress synced successfully',
            'user_id': user_id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/camera')
def camera():
    return render_template('camera.html')


@app.route('/learn')
def learn():
    return render_template('learn.html', syllables=SYLLABLES_DATA)

@app.route('/learn/<syllable>')
def learn_syllable(syllable):
    if syllable in SYLLABLES_DATA:
        next_syllable = get_next_syllable(syllable)
        previous_syllable = get_previous_syllable(syllable)
        current_index = get_syllable_index(syllable)
        total_syllables = len(SYLLABLE_ORDER)
        
        return render_template('syllable.html', 
                             syllable=syllable, 
                             data=SYLLABLES_DATA[syllable],
                             next_syllable=next_syllable,
                             previous_syllable=previous_syllable,
                             current_index=current_index,
                             total_syllables=total_syllables)
    return render_template('404.html'), 404

    if syllable in SYLLABLES_DATA:
        next_syllable = get_next_syllable(syllable)
        current_index = get_syllable_index(syllable)
        total_syllables = len(SYLLABLE_ORDER)
        
        return render_template('syllable.html', 
                             syllable=syllable, 
                             data=SYLLABLES_DATA[syllable],
                             next_syllable=next_syllable,
                             current_index=current_index,
                             total_syllables=total_syllables)
    return render_template('404.html'), 404

@app.route('/syllable_quiz')
def syllable_quiz():
    return render_template('quiz.html')


#Syllable Quiz Part
def generate_challenging_options(correct_syllable, num_options=5):
    """Generate challenging options for a given syllable based on ending groups"""
    if correct_syllable not in SYLLABLES_DATA:
        return random.sample(list(SYLLABLES_DATA.keys()), min(num_options, len(SYLLABLES_DATA)))
    
    options = [correct_syllable]
    syllable_group = SYLLABLES_DATA[correct_syllable]['group']
    
    # Strategy 1: Same group (most challenging) - get syllables from same ending/lip shape group
    if syllable_group in CHALLENGE_GROUPS:
        same_group = [s for s in CHALLENGE_GROUPS[syllable_group] if s != correct_syllable and s in SYLLABLES_DATA]
        # Add up to 3 from same group for maximum challenge
        options.extend(random.sample(same_group, min(3, len(same_group))))
    
    # Strategy 2: Fill remaining slots with random syllables from other groups
    remaining_syllables = [s for s in SYLLABLES_DATA.keys() if s not in options]
    
    if len(options) < num_options and remaining_syllables:
        needed = num_options - len(options)
        options.extend(random.sample(remaining_syllables, min(needed, len(remaining_syllables))))
    
    # Ensure we have exactly num_options
    options = options[:num_options]
    if len(options) < num_options:
        # Fallback: add any remaining syllables
        all_syllables = list(SYLLABLES_DATA.keys())
        while len(options) < num_options:
            random_syllable = random.choice(all_syllables)
            if random_syllable not in options:
                options.append(random_syllable)
    
    # Shuffle options so correct answer isn't always first
    random.shuffle(options)
    return options

@app.route('/api/quiz/questions')
def get_quiz_questions():
    """Generate a set of challenging quiz questions"""
    try:
        num_questions = 10
        questions = []
        
        # Select random syllables for questions
        available_syllables = list(SYLLABLES_DATA.keys())
        selected_syllables = random.sample(available_syllables, min(num_questions, len(available_syllables)))
        
        for syllable in selected_syllables:
            options = generate_challenging_options(syllable, 5)
            
            question = {
                'syllable': syllable,
                'gif': SYLLABLES_DATA[syllable]['gif'],
                'options': options,
                'group': SYLLABLES_DATA[syllable]['group']
            }
            questions.append(question)
        
        return jsonify({
            'success': True,
            'questions': questions,
            'total': len(questions)
        })
        
    except Exception as e:
        print(f"Error generating quiz questions: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500



@app.route('/api/quiz/question')
def get_quiz_question():
    """Get a single random quiz question (legacy endpoint)"""
    try:
        syllable = random.choice(list(SYLLABLES_DATA.keys()))
        options = generate_challenging_options(syllable, 5)
        
        return jsonify({
            'syllable': syllable,
            'gif': SYLLABLES_DATA[syllable]['gif'],
            'options': options
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/quiz/save-results', methods=['POST'])
def save_quiz_results():
    """Save quiz results to session"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Initialize session quiz history if not exists
        if 'quiz_history' not in session:
            session['quiz_history'] = []
        
        # Add timestamp
        import datetime
        data['timestamp'] = datetime.datetime.now().isoformat()
        data['quiz_id'] = len(session['quiz_history']) + 1
        
        # Save to session
        session['quiz_history'].append(data)
        
        # Keep only last 10 quiz results
        if len(session['quiz_history']) > 10:
            session['quiz_history'] = session['quiz_history'][-10:]
        
        # Update session stats
        if 'quiz_stats' not in session:
            session['quiz_stats'] = {
                'total_quizzes': 0,
                'best_score': 0,
                'best_accuracy': 0,
                'total_questions_answered': 0,
                'total_correct_answers': 0
            }
        
        stats = session['quiz_stats']
        stats['total_quizzes'] += 1
        stats['best_score'] = max(stats['best_score'], data['score'])
        stats['best_accuracy'] = max(stats['best_accuracy'], data['accuracy'])
        stats['total_questions_answered'] += data['total_questions']
        stats['total_correct_answers'] += data['correct_answers']
        
        session['quiz_stats'] = stats
        session.modified = True
        
        return jsonify({
            'success': True,
            'message': 'Results saved successfully',
            'quiz_id': data['quiz_id']
        })
        
    except Exception as e:
        print(f"Error saving quiz results: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/quiz/stats')
def get_quiz_stats():
    """Get user's quiz statistics"""
    try:
        stats = session.get('quiz_stats', {
            'total_quizzes': 0,
            'best_score': 0,
            'best_accuracy': 0,
            'total_questions_answered': 0,
            'total_correct_answers': 0
        })
        
        history = session.get('quiz_history', [])
        
        return jsonify({
            'success': True,
            'stats': stats,
            'recent_history': history[-5:] if history else []  # Last 5 quizzes
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


#Word Quiz Part
def generate_challenging_word_options(correct_word, num_options=5):
    """Generate challenging word options for a given word based on sound groups"""
    if correct_word not in WORDS_DATA:
        # fallback: random words if not in WORDS_DATA
        return random.sample(list(WORDS_DATA.keys()), min(num_options, len(WORDS_DATA)))
    
    options = [correct_word]
    word_group = WORDS_DATA[correct_word]['group']
    
    # Strategy 1: Same sound group (most challenging)
    if word_group in CHALLENGE_GROUPS:
        same_group = [w for w in CHALLENGE_GROUPS[word_group] 
                      if w != correct_word and w in WORDS_DATA]
        # Add up to 3 from same sound group
        if same_group:
            options.extend(random.sample(same_group, min(3, len(same_group))))
    
    # Strategy 2: Fill remaining slots with random words from other groups
    remaining_words = [w for w in WORDS_DATA.keys() if w not in options]
    
    if len(options) < num_options and remaining_words:
        needed = num_options - len(options)
        options.extend(random.sample(remaining_words, min(needed, len(remaining_words))))
    
    # Ensure exactly num_options
    options = options[:num_options]
    if len(options) < num_options:
        all_words = list(WORDS_DATA.keys())
        while len(options) < num_options:
            random_word = random.choice(all_words)
            if random_word not in options:
                options.append(random_word)
    
    # Shuffle so correct answer isn’t always first
    random.shuffle(options)
    return options

@app.route('/api/word-quiz/questions')
def get_word_quiz_questions():
    """Generate a set of challenging word quiz questions"""
    try:
        num_questions = 10
        questions = []
        
        # Select random words for questions
        available_words = list(WORDS_DATA.keys())
        selected_words = random.sample(available_words, min(num_questions, len(available_words)))
        
        for word in selected_words:
            options = generate_challenging_word_options(word, 5)
            
            question = {
                'word': word,
                'gif': WORDS_DATA[word]['gif'],
                'options': options,
                'group': WORDS_DATA[word]['group']
            }
            questions.append(question)
        
        return jsonify({
            'success': True,
            'questions': questions,
            'total': len(questions)
        })
        
    except Exception as e:
        print(f"Error generating word quiz questions: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/word-quiz/question')
def get_word_quiz_question():
    """Get a single random word quiz question"""
    try:
        word = random.choice(list(WORDS_DATA.keys()))
        options = generate_challenging_word_options(word, 5)
        
        return jsonify({
            'word': word,
            'gif': WORDS_DATA[word]['gif'],
            'options': options
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/word-quiz/save-results', methods=['POST'])
def save_word_quiz_results():
    """Save word quiz results to session"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Initialize session history if not exists
        if 'word_quiz_history' not in session:
            session['word_quiz_history'] = []
        
        # Add timestamp + quiz_id
        import datetime
        data['timestamp'] = datetime.datetime.now().isoformat()
        data['quiz_id'] = len(session['word_quiz_history']) + 1
        
        # Save to session
        session['word_quiz_history'].append(data)
        
        # Keep only last 10 results
        if len(session['word_quiz_history']) > 10:
            session['word_quiz_history'] = session['word_quiz_history'][-10:]
        
        # Update stats
        if 'word_quiz_stats' not in session:
            session['word_quiz_stats'] = {
                'total_quizzes': 0,
                'best_score': 0,
                'best_accuracy': 0,
                'total_questions_answered': 0,
                'total_correct_answers': 0
            }
        
        stats = session['word_quiz_stats']
        stats['total_quizzes'] += 1
        stats['best_score'] = max(stats['best_score'], data['score'])
        stats['best_accuracy'] = max(stats['best_accuracy'], data['accuracy'])
        stats['total_questions_answered'] += data['total_questions']
        stats['total_correct_answers'] += data['correct_answers']
        
        session['word_quiz_stats'] = stats
        session.modified = True
        
        return jsonify({
            'success': True,
            'message': 'Results saved successfully',
            'quiz_id': data['quiz_id']
        })
        
    except Exception as e:
        print(f"Error saving word quiz results: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/word-quiz/stats')
def get_word_quiz_stats():
    """Get user's word quiz statistics"""
    try:
        stats = session.get('word_quiz_stats', {
            'total_quizzes': 0,
            'best_score': 0,
            'best_accuracy': 0,
            'total_questions_answered': 0,
            'total_correct_answers': 0
        })
        
        history = session.get('word_quiz_history', [])
        
        return jsonify({
            'success': True,
            'stats': stats,
            'recent_history': history[-5:] if history else []  # Last 5 quizzes
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.route('/docs')
def documentation():
    return render_template('docs.html')

@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404


@app.route('/word-quiz')
def word_quiz():
    return render_template('word-quiz.html')


# === Face detection setup ===
DLIB_MODEL_PATH = "model/face_weights.dat"
try:
  detector = dlib.get_frontal_face_detector()
  predictor = dlib.shape_predictor(DLIB_MODEL_PATH)
  print(f"✅ Loaded dlib face landmarks model from {DLIB_MODEL_PATH}")
except Exception as e:
  print(f"❌ Failed to load dlib model: {e}")
  detector = None
  predictor = None

# Haar cascade as backup
haar_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

# === Image processing constants (match collect.py) ===
LIP_WIDTH = 112
LIP_HEIGHT = 80
CROP_MARGIN = 10

# === Image enhancement settings (match collect.py) ===
CLAHE_CLIP_LIMIT = 3.0
CLAHE_TILE_GRID_SIZE = (3, 3)
GAUSSIAN_BLUR_1 = (7, 7)
GAUSSIAN_BLUR_2 = (5, 5)
BILATERAL_FILTER_D = 5
BILATERAL_FILTER_SIGMA = 75
SHARPENING_KERNEL = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])

def crop_and_pad_mouth(frame, landmarks):
  """Crop mouth region, resize with reflect padding, and apply enhancements (collect.py)"""
  try:
    mouth_points = np.array([(landmarks.part(n).x, landmarks.part(n).y) for n in range(48, 68)])
    x, y, w, h = cv2.boundingRect(mouth_points)

    x1 = max(x - CROP_MARGIN, 0)
    y1 = max(y - CROP_MARGIN, 0)
    x2 = min(x + w + CROP_MARGIN, frame.shape[1])
    y2 = min(y + h + CROP_MARGIN, frame.shape[0])

    mouth_crop = frame[y1:y2, x1:x2]
    if mouth_crop.size == 0:
      return np.zeros((LIP_HEIGHT, LIP_WIDTH, 3), dtype=np.uint8)

    h_crop, w_crop, _ = mouth_crop.shape
    scale = min(LIP_WIDTH / w_crop, LIP_HEIGHT / h_crop)
    new_w, new_h = int(w_crop * scale), int(h_crop * scale)
    resized = cv2.resize(mouth_crop, (new_w, new_h))

    pad_top = (LIP_HEIGHT - new_h) // 2
    pad_bottom = LIP_HEIGHT - new_h - pad_top
    pad_left = (LIP_WIDTH - new_w) // 2
    pad_right = LIP_WIDTH - new_w - pad_left

    lip_frame = cv2.copyMakeBorder(
      resized, pad_top, pad_bottom, pad_left, pad_right, borderType=cv2.BORDER_REFLECT
    )

    # Enhancements (CLAHE, blur, bilateral, sharpen, final blur)
    lab = cv2.cvtColor(lip_frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=CLAHE_CLIP_LIMIT, tileGridSize=CLAHE_TILE_GRID_SIZE)
    l = clahe.apply(l)
    lab = cv2.merge((l, a, b))
    lip_frame = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    lip_frame = cv2.GaussianBlur(lip_frame, GAUSSIAN_BLUR_1, 0)
    lip_frame = cv2.bilateralFilter(lip_frame, BILATERAL_FILTER_D, BILATERAL_FILTER_SIGMA, BILATERAL_FILTER_SIGMA)
    lip_frame = cv2.filter2D(lip_frame, -1, SHARPENING_KERNEL)
    lip_frame = cv2.GaussianBlur(lip_frame, GAUSSIAN_BLUR_2, 0)

    return lip_frame
  except Exception as e:
    print(f"Error in crop_and_pad_mouth: {e}")
    return np.zeros((LIP_HEIGHT, LIP_WIDTH, 3), dtype=np.uint8)

def process_frames_for_prediction(frames):
  """Process uploaded frames for model prediction with collect.py preprocessing"""
  processed_frames = []
  for frame_file in frames:
    try:
      image = Image.open(frame_file.stream)
      frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

      gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
      faces = detector(gray, 1) if detector else []

      if not faces:
        faces_haar = haar_cascade.detectMultiScale(gray, 1.1, 5)
        faces = [dlib.rectangle(x, y, x + w, y + h) for (x, y, w, h) in faces_haar]

      if faces:
        face = max(faces, key=lambda f: f.bottom() - f.top()) if len(faces) > 1 else faces[0]
        landmarks = predictor(gray, face) if predictor else None
        if landmarks:
          mouth_frame = crop_and_pad_mouth(frame, landmarks)
          processed_frames.append(mouth_frame)
        else:
          processed_frames.append(np.zeros((LIP_HEIGHT, LIP_WIDTH, 3), dtype=np.uint8))
      else:
        processed_frames.append(np.zeros((LIP_HEIGHT, LIP_WIDTH, 3), dtype=np.uint8))
    except Exception as e:
      print(f"Error processing frame: {e}")
      processed_frames.append(np.zeros((LIP_HEIGHT, LIP_WIDTH, 3), dtype=np.uint8))
  return processed_frames

def has_sufficient_motion(frames, min_diff=5.0):
  """Check if recorded frames have sufficient motion"""
  if len(frames) < 3:
    return True
  total_diff = 0
  significant_changes = 0
  for i in range(1, len(frames)):
    diff = np.mean(np.abs(np.array(frames[i]).astype(float) - np.array(frames[i - 1]).astype(float)))
    total_diff += diff
    if diff > min_diff:
      significant_changes += 1
  avg_diff = total_diff / (len(frames) - 1)
  motion_ratio = significant_changes / (len(frames) - 1)
  return avg_diff > min_diff and motion_ratio > 0.3

@app.route('/api/detect/landmarks', methods=['POST'])
def detect_landmarks():
  """Detect face and mouth landmarks for live overlay"""
  try:
    if 'frame' not in request.files:
      return jsonify({'error': 'No frame provided'}), 400

    frame_file = request.files['frame']
    image = Image.open(frame_file.stream)
    frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = detector(gray, 1) if detector else []

    if not faces:
      faces_haar = haar_cascade.detectMultiScale(gray, 1.1, 5)
      faces = [dlib.rectangle(x, y, x + w, y + h) for (x, y, w, h) in faces_haar]

    if faces:
      face = max(faces, key=lambda f: f.bottom() - f.top()) if len(faces) > 1 else faces[0]
      landmarks = predictor(gray, face) if predictor else None
      if landmarks:
        mouth_points = []
        for n in range(48, 68):
          point = landmarks.part(n)
          mouth_points.append({'x': int(point.x), 'y': int(point.y)})

        face_outline = []
        for n in range(0, 17):
          point = landmarks.part(n)
          face_outline.append({'x': int(point.x), 'y': int(point.y)})

        return jsonify({
          'success': True,
          'landmarks': {
            'mouth_points': mouth_points,
            'face_outline': face_outline
          }
        })

    return jsonify({'success': False, 'message': 'No face detected'})
  except Exception as e:
    print(f"Error in landmarks detection: {e}")
    return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/predict/syllable/<category>', methods=['POST'])
def predict_syllable_category(category):
  """Predict syllable for specific category (collect.py preprocessing, 22 frames)"""
  try:
    if category not in MODEL_CONFIGS:
      return jsonify({'error': f'Unknown category: {category}'}), 400

    model = load_model_for_category(category)
    if model is None:
      return jsonify({'error': f'Failed to load model for category: {category}'}), 500

    frames = request.files.getlist('frames')
    if not frames:
      return jsonify({'error': 'No frames provided'}), 400

    processed_frames = process_frames_for_prediction(frames)
    if len(processed_frames) == 0:
      return jsonify({'error': 'No valid frames processed'}), 400

    target_frames = min(22, len(processed_frames))
    video_data = processed_frames[:target_frames]

    while len(video_data) < 22:
      video_data.append(np.zeros((LIP_HEIGHT, LIP_WIDTH, 3), dtype=np.uint8))

    video = np.array(video_data)  # (22, 80, 112, 3) if you read as (H, W), but our constants map to (H=80, W=112)
    video = video.astype(np.float32) / 255.0
    video = np.expand_dims(video, axis=0)  # (1, 22, 80, 112, 3)

    predictions = model.predict(video)
    pred_idx = int(np.argmax(predictions[0]))
    pred_confidence = float(predictions[0][pred_idx])

    classes = MODEL_CONFIGS[category]['classes']
    predicted_syllable = classes[pred_idx]

    return jsonify({
      'success': True,
      'predicted_syllable': predicted_syllable,
      'accuracy': pred_confidence,
      'category': category,
      'frames_processed': len(processed_frames)
    })
  except Exception as e:
    print(f"Error in syllable prediction: {e}")
    return jsonify({'success': False, 'error': str(e)}), 500



@app.route('/api/predict/words', methods=['POST'])
def predict_words():
  """Predict Filipino words (collect.py preprocessing, 44 frames, top-5)"""
  try:
    model = load_model_for_category('words')
    if model is None:
      return jsonify({'error': 'Failed to load words model'}), 500

    frames = request.files.getlist('frames')
    if not frames:
      return jsonify({'error': 'No frames provided'}), 400

    processed_frames = process_frames_for_prediction(frames)
    if len(processed_frames) == 0:
      return jsonify({'error': 'No valid frames processed'}), 400

    target_frames = min(44, len(processed_frames))
    video_data = processed_frames[:target_frames]

    while len(video_data) < 44:
      video_data.append(np.zeros((LIP_HEIGHT, LIP_WIDTH, 3), dtype=np.uint8))

    video = np.array(video_data)  # (44, 80, 112, 3)
    video = video.astype(np.float32) / 255.0
    video = np.expand_dims(video, axis=0)  # (1, 44, 80, 112, 3)

    predictions = model.predict(video)[0]
    top_indices = np.argsort(predictions)[-5:][::-1]
    classes = MODEL_CONFIGS['words']['classes']

    top_predictions = []
    for idx in top_indices:
      top_predictions.append({
        'word': classes[int(idx)],
        'confidence': float(predictions[int(idx)])
      })

    return jsonify({
      'success': True,
      'predictions': top_predictions,
      'frames_processed': len(processed_frames)
    })
  except Exception as e:
    print(f"Error in word prediction: {e}")
    return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == "__main__":
  app.run(host="0.0.0.0", port=5000)