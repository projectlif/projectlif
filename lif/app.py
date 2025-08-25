from flask import Flask, render_template, request, jsonify, session
import os
import random
import cv2
import dlib
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
    'aso': {
        'description': 'A common Filipino word meaning "dog"',
        'gif': '/static/gifs/words/aso.gif',
    },
    'puso': {
        'description': 'Filipino word meaning "heart"',
        'gif': '/static/gifs/words/puso.gif',
    },
    'mata': {
        'description': 'Filipino word meaning "eye"',
        'gif': '/static/gifs/words/mata.gif',
    },
}


CHALLENGE_GROUPS = {
    'a_endings': ['a', 'ba', 'da', 'ka', 'ga', 'ha', 'la', 'ma', 'na', 'nga', 'pa', 'ra', 'sa', 'ta', 'wa', 'ya'],
    'e_endings': ['e', 'be', 'de', 'ke', 'ge', 'he', 'le', 'me', 'ne', 'nge', 'pe', 're', 'se', 'te', 'we', 'ye'],
    'i_endings': ['i', 'bi', 'di', 'ki', 'gi', 'hi', 'li', 'mi', 'ni', 'ngi', 'pi', 'ri', 'si', 'ti', 'wi', 'yi'],
    'o_endings': ['o', 'bo', 'do', 'ko', 'go', 'ho', 'lo', 'mo', 'no', 'ngo', 'po', 'ro', 'so', 'to', 'wo', 'yo'],
    'u_endings': ['u', 'bu', 'du', 'ku', 'gu', 'hu', 'lu', 'mu', 'nu', 'ngu', 'pu', 'ru', 'su', 'tu', 'wu', 'yu'],
}


# Model configurations
MODEL_CONFIGS = {
    'vowels': {
        'model_path': 'model/model_vowels.h5',
        'classes': ['a', 'e', 'i', 'o', 'u']
    },
    'b': {
        'model_path': 'model/model_b.h5',
        'classes': ['ba', 'be', 'bi', 'bo', 'bu']
    },
    'k': {
        'model_path': 'model/model_k.h5',
        'classes': ['ka', 'ke', 'ki', 'ko', 'ku']
    },
    'd': {
        'model_path': 'model/model_d.h5',
        'classes': ['da', 'de', 'di', 'do', 'du']
    },
    'g': {
        'model_path': 'model/model_g.h5',
        'classes': ['ga', 'ge', 'gi', 'go', 'gu']
    },
    'h': {
        'model_path': 'model/model_h.h5',
        'classes': ['ha', 'he', 'hi', 'ho', 'hu']
    },
    'l': {
        'model_path': 'model/model_l.h5',
        'classes': ['la', 'le', 'li', 'lo', 'lu']
    },
    'm': {
        'model_path': 'model/model_m.h5',
        'classes': ['ma', 'me', 'mi', 'mo', 'mu']
    },
    'n': {
        'model_path': 'model/model_n.h5',
        'classes': ['na', 'ne', 'ni', 'no', 'nu']
    },
    'ng': {
        'model_path': 'model/model_ng.h5',
        'classes': ['nga', 'nge', 'ngi', 'ngo', 'ngu']
    },
    'p': {
        'model_path': 'model/model_p.h5',
        'classes': ['pa', 'pe', 'pi', 'po', 'pu']
    },
    'r': {
        'model_path': 'model/model_r.h5',
        'classes': ['ra', 're', 'ri', 'ro', 'ru']
    },
    's': {
        'model_path': 'model/model_s.h5',
        'classes': ['sa', 'se', 'si', 'so', 'su']
    },
    't': {
        'model_path': 'model/model_t.h5',
        'classes': ['ta', 'te', 'ti', 'to', 'tu']
    },
    'w': {
        'model_path': 'model/model_w.h5',
        'classes': ['wa', 'we', 'wi', 'wo', 'wu']
    },
    'y': {
        'model_path': 'model/model_y.h5',
        'classes': ['ya', 'ye', 'yi', 'yo', 'yu']
    },
    'words': {
        'model_path': 'model/model_filipinowords.h5',
        'classes': ["aba", "abo", "awa", "baga", "bawi", "buti", "dati", "dulo", "diwa", "gawa", "gisa", "gulo", "haba", "hilo", "hula", "iba", "kami", "kape", "kusa", "laro", "ligo", "luma", "mapa", "misa", "mula", "nasa", "nawa", "nito", "ngiti", "nguya", "oo", "paa", "piso", "puti", "rito", "ruta", "relo", "sabi", "sako", "sino", "tabi", "tago", "tula", "uso", "wala", "wika", "walo", "yaya", "yelo", "yoyo"]

    }
}


# Loaded models cache
loaded_models = {}

# Face detection setup
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

# Image processing constants
LIP_WIDTH = 80
LIP_HEIGHT = 112
CROP_MARGIN = 10

def load_model_for_category(category):
    """Load and cache model for specific category"""
    if category in loaded_models:
        return loaded_models[category]
    
    if category not in MODEL_CONFIGS:
        raise ValueError(f"Unknown category: {category}")
    
    config = MODEL_CONFIGS[category]
    try:
        model = load_model(config['model_path'])
        loaded_models[category] = model
        print(f"✅ Loaded model for category: {category}")
        return model
    except Exception as e:
        print(f"❌ Failed to load model for {category}: {e}")
        return None

def crop_and_pad_mouth(frame, landmarks):
    """Crop mouth region and resize for model input"""
    try:
        # Get mouth bounding box
        mouth_points = np.array([(landmarks.part(n).x, landmarks.part(n).y) for n in range(48, 68)])
        x, y, w, h = cv2.boundingRect(mouth_points)

        # Add margin and ensure within frame bounds
        x1 = max(x - CROP_MARGIN, 0)
        y1 = max(y - CROP_MARGIN, 0)
        x2 = min(x + w + CROP_MARGIN, frame.shape[1])
        y2 = min(y + h + CROP_MARGIN, frame.shape[0])

        # Crop mouth region
        mouth_crop = frame[y1:y2, x1:x2]
        if mouth_crop.size == 0:
            return np.zeros((LIP_HEIGHT, LIP_WIDTH, 3), dtype=np.uint8)

        # Scale to fit target resolution while maintaining aspect ratio
        h_crop, w_crop, _ = mouth_crop.shape
        scale = min(LIP_WIDTH / w_crop, LIP_HEIGHT / h_crop)
        new_w, new_h = int(w_crop * scale), int(h_crop * scale)
        resized = cv2.resize(mouth_crop, (new_w, new_h))

        # Center crop with reflective padding
        pad_top = (LIP_HEIGHT - new_h) // 2
        pad_bottom = LIP_HEIGHT - new_h - pad_top
        pad_left = (LIP_WIDTH - new_w) // 2
        pad_right = LIP_WIDTH - new_w - pad_left

        lip_frame = cv2.copyMakeBorder(
            resized, pad_top, pad_bottom, pad_left, pad_right, borderType=cv2.BORDER_REFLECT
        )

        return lip_frame
    except Exception as e:
        print(f"Error in crop_and_pad_mouth: {e}")
        return np.zeros((LIP_HEIGHT, LIP_WIDTH, 3), dtype=np.uint8)

def process_frames_for_prediction(frames):
    """Process uploaded frames for model prediction"""
    processed_frames = []
    
    for frame_file in frames:
        try:
            # Read image
            image = Image.open(frame_file.stream)
            frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Detect face and landmarks
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = detector(gray, 1) if detector else []
            
            if not faces:
                # Try Haar cascade as backup
                faces_haar = haar_cascade.detectMultiScale(gray, 1.1, 5)
                faces = [dlib.rectangle(x, y, x + w, y + h) for (x, y, w, h) in faces_haar]
            
            if faces:
                # Use the largest face
                face = max(faces, key=lambda f: f.bottom() - f.top()) if len(faces) > 1 else faces[0]
                landmarks = predictor(gray, face) if predictor else None
                
                if landmarks:
                    # Crop and process mouth region
                    mouth_frame = crop_and_pad_mouth(frame, landmarks)
                    processed_frames.append(mouth_frame)
                else:
                    # If no landmarks, use a zero frame
                    processed_frames.append(np.zeros((LIP_HEIGHT, LIP_WIDTH, 3), dtype=np.uint8))
            else:
                # If no face detected, use a zero frame
                processed_frames.append(np.zeros((LIP_HEIGHT, LIP_WIDTH, 3), dtype=np.uint8))
                
        except Exception as e:
            print(f"Error processing frame: {e}")
            processed_frames.append(np.zeros((LIP_HEIGHT, LIP_WIDTH, 3), dtype=np.uint8))
    
    return processed_frames



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
    # Only show welcome message once per session
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

SYLLABLE_ORDER = ["a", "e", "i", "o", "u", "ba", "be", "bi", "bo", "bu", "ka", "ke", "ki", "ko", "ku", "da", "de", "di",
             "do", "du", "ga", "ge", "gi", "go", "gu", "ha", "he", "hi", "ho", "hu", "la", "le", "li", "lo", "lu", "ma",
             "me", "mi", "mo", "mu", "na", "ne", "ni", "no", "nu", "nga", "nge", "ngi", "ngo", "ngu", "pa", "pe", "pi",
             "po", "pu", "ra", "re", "ri", "ro", "ru", "sa", "se", "si", "so", "su", "ta", "te", "ti", "to", "tu", "wa",
             "we", "wi", "wo", "wu", "ya", "ye", "yi", "yo", "yu"]

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

# Add route to save quiz score
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
        # Sort by score descending and keep top 3
        high_scores.sort(key=lambda x: x['score'], reverse=True)
        session['quiz_high_scores'] = high_scores[:3]
        
        return jsonify({
            'success': True,
            'high_scores': session['quiz_high_scores'],
            'is_new_high_score': len(high_scores) == 1 or new_score['score'] == high_scores[0]['score']
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

@app.route('/quiz')
def quiz():
    return render_template('quiz.html')


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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)


MODEL_PATH = "model_vowelspcv150.h5"
DLIB_PATH = "face_weights.dat"
LABELS = ["a", "e", "i", "o", "u"]
SEQUENCE_LENGTH = 22
FRAME_WIDTH, FRAME_HEIGHT = 112, 80
MOUTH_MOVEMENT_THRESHOLD = 12

model = tf.keras.models.load_model(MODEL_PATH)
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor(DLIB_PATH)

def extract_mouth(frame, landmarks):
    mouth_points = np.array([(landmarks.part(i).x, landmarks.part(i).y) for i in range(48, 68)])
    x, y, w, h = cv2.boundingRect(mouth_points)
    margin = 10
    x1 = max(x - margin, 0)
    y1 = max(y - margin, 0)
    x2 = min(x + w + margin, frame.shape[1])
    y2 = min(y + h + margin, frame.shape[0])
    mouth_crop = frame[y1:y2, x1:x2]
    
    h_crop, w_crop, _ = mouth_crop.shape
    scale = min(FRAME_WIDTH / w_crop, FRAME_HEIGHT / h_crop)
    new_w, new_h = int(w_crop * scale), int(h_crop * scale)
    resized = cv2.resize(mouth_crop, (new_w, new_h))
    
    pad_top = (FRAME_HEIGHT - new_h) // 2
    pad_bottom = FRAME_HEIGHT - new_h - pad_top
    pad_left = (FRAME_WIDTH - new_w) // 2
    pad_right = FRAME_WIDTH - new_w - pad_left
    padded = cv2.copyMakeBorder(resized, pad_top, pad_bottom, pad_left, pad_right, borderType=cv2.BORDER_REFLECT)
    
    lab = cv2.cvtColor(padded, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(3, 3))
    l = clahe.apply(l)
    lab = cv2.merge((l, a, b))
    enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    enhanced = cv2.GaussianBlur(enhanced, (7, 7), 0)
    enhanced = cv2.bilateralFilter(enhanced, 5, 75, 75)
    kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
    enhanced = cv2.filter2D(enhanced, -1, kernel)
    enhanced = cv2.GaussianBlur(enhanced, (5, 5), 0)
    return enhanced

# New prediction endpoints for camera functionality
@app.route('/api/predict/syllable/<category>', methods=['POST'])
def predict_syllable_category(category):
    """Predict syllable for specific category (e.g., 'b', 'k', 'vowels', etc.)"""
    try:
        if category not in MODEL_CONFIGS:
            return jsonify({'error': f'Unknown category: {category}'}), 400
        
        # Load model for this category
        model = load_model_for_category(category)
        if model is None:
            return jsonify({'error': f'Failed to load model for category: {category}'}), 500
        
        # Get uploaded frames
        frames = request.files.getlist('frames')
        if not frames:
            return jsonify({'error': 'No frames provided'}), 400
        
        # Process frames
        processed_frames = process_frames_for_prediction(frames)
        
        if len(processed_frames) == 0:
            return jsonify({'error': 'No valid frames processed'}), 400
        
        # Prepare data for model
        # Take only the required number of frames (22 for syllables)
        target_frames = min(22, len(processed_frames))
        video_data = processed_frames[:target_frames]
        
        # Pad if necessary
        while len(video_data) < 22:
            video_data.append(np.zeros((LIP_HEIGHT, LIP_WIDTH, 3), dtype=np.uint8))
        
        # Convert to model input format
        video = np.array(video_data)  # (22, 112, 80, 3)
        video = video.astype(np.float32) / 255.0
        video = np.expand_dims(video, axis=0)  # (1, 22, 112, 80, 3)
        
        # Make prediction
        predictions = model.predict(video)
        pred_idx = np.argmax(predictions[0])
        pred_confidence = predictions[0][pred_idx]
        
        # Get class labels for this category
        classes = MODEL_CONFIGS[category]['classes']
        predicted_syllable = classes[pred_idx]
        
        return jsonify({
            'success': True,
            'predicted_syllable': predicted_syllable,
            'accuracy': float(pred_confidence),
            'category': category,
            'frames_processed': len(processed_frames)
        })
        
    except Exception as e:
        print(f"Error in syllable prediction: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/predict/words', methods=['POST'])
def predict_words():
    """Predict Filipino words and return top 5 predictions"""
    try:
        # Load words model
        model = load_model_for_category('words')
        if model is None:
            return jsonify({'error': 'Failed to load words model'}), 500
        
        # Get uploaded frames
        frames = request.files.getlist('frames')
        if not frames:
            return jsonify({'error': 'No frames provided'}), 400
        
        # Process frames
        processed_frames = process_frames_for_prediction(frames)
        
        if len(processed_frames) == 0:
            return jsonify({'error': 'No valid frames processed'}), 400
        
        # Prepare data for model (44 frames for words)
        target_frames = min(44, len(processed_frames))
        video_data = processed_frames[:target_frames]
        
        # Pad if necessary
        while len(video_data) < 44:
            video_data.append(np.zeros((LIP_HEIGHT, LIP_WIDTH, 3), dtype=np.uint8))
        
        # Convert to model input format
        video = np.array(video_data)  # (44, 112, 80, 3)
        video = video.astype(np.float32) / 255.0
        video = np.expand_dims(video, axis=0)  # (1, 44, 112, 80, 3)
        
        # Make prediction
        predictions = model.predict(video)[0]
        
        # Get top 5 predictions
        top_indices = np.argsort(predictions)[-5:][::-1]  # Top 5 in descending order
        classes = MODEL_CONFIGS['words']['classes']
        
        top_predictions = []
        for idx in top_indices:
            top_predictions.append({
                'word': classes[idx],
                'confidence': float(predictions[idx])
            })
        
        return jsonify({
            'success': True,
            'predictions': top_predictions,
            'frames_processed': len(processed_frames)
        })
        
    except Exception as e:
        print(f"Error in word prediction: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

    try:
        if 'image' in request.files:
            file = request.files['image']
            image_data = file.read()
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'error': 'Invalid image format'}), 400
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = detector(gray)
        
        if not faces:
            return jsonify({'predictions': []})
        
        face = faces[0]
        landmarks = predictor(gray, face)
        mouth = extract_mouth(frame, landmarks)

        sequence = np.array([mouth] * SEQUENCE_LENGTH)
        sequence_input = sequence[None, ...]

        preds = model.predict(sequence_input, verbose=0)[0]
        top5 = preds.argsort()[::-1][:5]

        predictions = []
        for i in top5:
            predictions.append({
                'syllable': LABELS[i],
                'confidence': float(preds[i])
            })
        
        return jsonify({'predictions': predictions})
        
    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({'error': 'Prediction failed'}), 500
    
    try:
        if syllable not in SYLLABLES_DATA:
            return jsonify({'error': 'Invalid syllable'}), 400
            
        # Get image data from request
        if 'image' in request.files:
            file = request.files['image']
            image_data = file.read()
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        # Convert to OpenCV format
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'error': 'Invalid image format'}), 400
        
        # Detect face and extract mouth
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = detector(gray)
        
        if not faces:
            return jsonify({
                'detected': False,
                'message': 'No face detected',
                'target_syllable': syllable,
                'accuracy': 0
            })
        
        face = faces[0]
        landmarks = predictor(gray, face)
        mouth = extract_mouth(frame, landmarks)
        
        # Create sequence for prediction
        sequence = np.array([mouth] * SEQUENCE_LENGTH)
        sequence_input = sequence[None, ...]
        
        # Make prediction
        preds = model.predict(sequence_input, verbose=0)[0]
        
        # Get prediction for target syllable
        target_index = LABELS.index(syllable)
        target_confidence = float(preds[target_index])
        
        # Get top prediction
        top_prediction_index = np.argmax(preds)
        top_prediction = LABELS[top_prediction_index]
        top_confidence = float(preds[top_prediction_index])
        
        # Determine if user is saying the correct syllable
        is_correct = top_prediction == syllable
        accuracy_threshold = 0.6  # Adjust as needed
        
        return jsonify({
            'detected': True,
            'target_syllable': syllable,
            'predicted_syllable': top_prediction,
            'target_confidence': target_confidence,
            'top_confidence': top_confidence,
            'is_correct': is_correct and target_confidence > accuracy_threshold,
            'accuracy': target_confidence,
            'message': f"You said '{top_prediction}'" + (f" (correct!)" if is_correct else f" (try '{syllable}')")
        })
        
    except Exception as e:
        print(f"Syllable prediction error: {e}")
        return jsonify({'error': 'Prediction failed'}), 500
    
# === Word-level Model Configuration ===
WORD_MODEL_PATH = "model_w.h5"
WORD_LABELS = ["abo", "iba", "bati", "bato", "bota", "buti", "daga", "diwa", "gulo", "dusa"]
WORD_SEQUENCE_LENGTH = 32
WORD_FRAME_WIDTH = 80
WORD_FRAME_HEIGHT = 112

# Load word model
word_model = tf.keras.models.load_model(WORD_MODEL_PATH)

@app.route('/api/predict_word', methods=['POST'])
def predict_word():
    try:
        if 'image' in request.files:
            file = request.files['image']
            image_data = file.read()
        else:
            return jsonify({'error': 'No image provided'}), 400

        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({'error': 'Invalid image format'}), 400

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = detector(gray)

        if not faces:
            return jsonify({'predictions': []})

        face = faces[0]
        landmarks = predictor(gray, face)
        mouth = extract_mouth(frame, landmarks)  # Reuse same function

        # Create sequence of 32 identical frames (you can improve this later)
        sequence = np.array([mouth] * WORD_SEQUENCE_LENGTH)
        sequence_input = sequence[None, ...]

        preds = word_model.predict(sequence_input, verbose=0)[0]
        top5 = preds.argsort()[::-1][:5]

        predictions = [{
            'syllable': WORD_LABELS[i],  # still using 'syllable' key for frontend consistency
            'confidence': float(preds[i])
        } for i in top5]

        return jsonify({'predictions': predictions})

    except Exception as e:
        print(f"Word prediction error: {e}")
        return jsonify({'error': 'Prediction failed'}), 500

    try:
        if "image" not in request.files:
            return jsonify({"error": "No image provided"}), 400

        file = request.files["image"]
        image_data = file.read()
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({"error": "Invalid image"}), 400

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = detector(gray)
        if not faces:
            return jsonify({"error": "No face detected"}), 400

        face = faces[0]
        landmarks = predictor(gray, face)
        mouth = extract_mouth(frame, landmarks)

        sequence_input = np.expand_dims(mouth, axis=0)          # (1, 112, 80, 3)
        sequence_input = np.expand_dims(sequence_input, axis=0) # (1, 1, 112, 80, 3)

        preds = word_model.predict(sequence_input, verbose=0)[0]
        top5 = preds.argsort()[::-1][:5]
        predictions = [{"word": WORD_LABELS[i], "confidence": float(preds[i])} for i in top5]

        return jsonify({"predictions": predictions})
    
    except Exception as e:
        print("Word prediction error:", e)
        return jsonify({"error": "Prediction failed"}), 500
    try:
        if 'frames' not in request.files:
            return jsonify({'error': 'No frames provided'}), 400

        # Parse multiple frame images from form
        frames = []
        for i in range(WORD_SEQUENCE_LENGTH):
            file_key = f'frame_{i}'
            if file_key not in request.files:
                return jsonify({'error': f'Missing frame {i}'}), 400

            file = request.files[file_key]
            image_data = file.read()
            nparr = np.frombuffer(image_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                return jsonify({'error': f'Invalid frame {i}'}), 400

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = detector(gray)
            if not faces:
                return jsonify({'error': f'No face detected on frame {i}'}), 400

            face = faces[0]
            landmarks = predictor(gray, face)
            mouth = extract_mouth(frame, landmarks)
            frames.append(mouth)

        if len(frames) != WORD_SEQUENCE_LENGTH:
            return jsonify({'error': 'Incomplete sequence'}), 400

        sequence_input = np.array(frames)[None, ...]  # shape (1, 32, 112, 80, 3)
        preds = word_model.predict(sequence_input, verbose=0)[0]
        top5 = preds.argsort()[::-1][:5]

        predictions = []
        for i in top5:
            predictions.append({
                'word': WORD_LABELS[i],
                'confidence': float(preds[i])
            })

        return jsonify({'predictions': predictions})

    except Exception as e:
        print(f"Word prediction error: {e}")
        return jsonify({'error': 'Prediction failed'}), 500



@app.route('/api/predict/syllable/<syllable>', methods=['POST'])
def predict_specific_syllable(syllable):
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
            
        image_file = request.files['image']
        
        # Mock face/mouth detection - higher chance of detection
        face_detected = random.random() > 0.1  # 90% chance of detection
        
        if not face_detected:
            return jsonify({
                'detected': False,
                'message': 'No face detected'
            })
        
        # Mock model prediction with bias toward correct answer
        all_syllables = list(SYLLABLES_DATA.keys())
        
        # 70% chance of getting the correct syllable
        if random.random() < 0.7:
            predicted_syllable = syllable
        else:
            # 30% chance of getting a different syllable
            other_syllables = [s for s in all_syllables if s != syllable]
            predicted_syllable = random.choice(other_syllables) if other_syllables else syllable
        
        # Calculate if prediction matches target
        is_correct = predicted_syllable.lower() == syllable.lower()
        
        # More realistic confidence scores
        if is_correct:
            target_confidence = random.uniform(0.75, 0.95)
            accuracy = random.uniform(0.8, 0.95)
        else:
            target_confidence = random.uniform(0.3, 0.6)
            accuracy = random.uniform(0.4, 0.7)
        
        return jsonify({
            'detected': True,
            'is_correct': is_correct,
            'predicted_syllable': predicted_syllable,
            'target_syllable': syllable,
            'target_confidence': target_confidence,
            'accuracy': accuracy,
            'message': f'Detected: {predicted_syllable}' + (' ✓' if is_correct else f' (expected: {syllable})')
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

@app.route('/word-quiz')
def word_quiz():
    return render_template('word-quiz.html')

@app.route('/api/word-quiz/question')
def get_word_quiz_question():
    word = random.choice(list(WORDS_DATA.keys()))
    # Ensure correct answer is always included
    options = [word]
    remaining_words = [w for w in WORDS_DATA.keys() if w != word]
    
    # Add 3 random incorrect options
    while len(options) < 4 and remaining_words:
        random_word = random.choice(remaining_words)
        options.append(random_word)
        remaining_words.remove(random_word)
    
    # Shuffle options
    random.shuffle(options)
    
    return jsonify({
        'word': word,
        'gif': WORDS_DATA[word]['gif'],
        'translation': WORDS_DATA[word]['translation'],
        'options': options
    })