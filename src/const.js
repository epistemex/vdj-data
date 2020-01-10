/**************************************
 *
 *  Constants
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

module.exports = {

  FRAMESV10: [ // Note: these are pseudo frames as V1x doesn't have frames
    'TIT2', 'TPE1', 'TALB', 'TYER', 'COMM', 'TCON'
  ],

  FRAMESV11: [ // Note: these are pseudo frames as V1x doesn't have frames
    'TIT2', 'TPE1', 'TALB', 'TYER', 'COMM', 'TRCK', 'TCON'
  ],

  FRAMESV22: [
    'BUF', 'CNT', 'COM', 'CRA', 'CRM', 'ETC', 'EQU', 'GEO', 'IPL', 'LNK', 'MCI', 'MLL', 'PIC', 'POP', 'REV',
    'RVA', 'SLT', 'STC', 'TAL', 'TBP', 'TCM', 'TCO', 'TCR', 'TDA', 'TDY', 'TEN', 'TFT', 'TIM', 'TKE', 'TLA',
    'TLE', 'TMT', 'TOA', 'TOF', 'TOL', 'TOR', 'TOT', 'TP1', 'TP2', 'TP3', 'TP4', 'TPA', 'TPB', 'TRC', 'TRD',
    'TRK', 'TSI', 'TSS', 'TT1', 'TT2', 'TT3', 'TXT', 'TXX', 'TYE', 'UFI', 'ULT', 'WAF', 'WAR', 'WAS', 'WCM',
    'WCP', 'WPB', 'WXX' ],

  FRAMESV23: [
    'AENC', 'APIC', 'COMM', 'COMR', 'ENCR', 'EQUA', 'ETCO', 'GEOB', 'GRID', 'IPLS', 'LINK', 'MCDI', 'MLLT',
    'OWNE', 'PRIV', 'PCNT', 'POPM', 'POSS', 'RBUF', 'RVAD', 'RVRB', 'SYLT', 'SYTC', 'TALB', 'TBPM', 'TCOM',
    'TCON', 'TCOP', 'TDAT', 'TDLY', 'TENC', 'TEXT', 'TFLT', 'TIME', 'TIT1', 'TIT2', 'TIT3', 'TKEY', 'TLAN',
    'TLEN', 'TMED', 'TOAL', 'TOFN', 'TOLY', 'TOPE', 'TORY', 'TOWN', 'TPE1', 'TPE2', 'TPE3', 'TPE4', 'TPOS',
    'TPUB', 'TRCK', 'TRDA', 'TRSN', 'TRSO', 'TSIZ', 'TSRC', 'TSSE', 'TYER', 'TXXX', 'UFID', 'USER', 'USLT',
    'WCOM', 'WCOP', 'WOAF', 'WOAR', 'WOAS', 'WORS', 'WPAY', 'WPUB', 'WXXX' ],

  FRAMESV24: [
    'AENC', 'APIC', 'ASPI', 'COMM', 'COMR', 'ENCR', 'EQU2', 'ETCO', 'GEOB', 'GRID', 'LINK', 'MCDI', 'MLLT',
    'OWNE', 'PRIV', 'PCNT', 'POPM', 'POSS', 'RBUF', 'RVA2', 'RVRB', 'SEEK', 'SIGN', 'SYLT', 'SYTC', 'TALB',
    'TBPM', 'TCOM', 'TCON', 'TCOP', 'TDEN', 'TDLY', 'TDOR', 'TDRC', 'TDRL', 'TDTG', 'TENC', 'TEXT', 'TFLT',
    'TIPL', 'TIT1', 'TIT2', 'TIT3', 'TKEY', 'TLAN', 'TLEN', 'TMCL', 'TMED', 'TMOO', 'TOAL', 'TOFN', 'TOLY',
    'TOPE', 'TOWN', 'TPE1', 'TPE2', 'TPE3', 'TPE4', 'TPOS', 'TPRO', 'TPUB', 'TRCK', 'TRSN', 'TRSO', 'TSOA',
    'TSOP', 'TSOT', 'TSRC', 'TSSE', 'TSST', 'TXXX', 'UFID', 'USER', 'USLT', 'WCOM', 'WCOP', 'WOAF', 'WOAR',
    'WOAS', 'WORS', 'WPAY', 'WPUB', 'WXXX' ],

  FRAMENAME: {
    'AENC': 'audioEncryption',
    'APIC': 'attachedPicture',
    'ASPI': 'audioSeekPointIndex',
    'COMM': 'comment',
    'COMR': 'commercialFrame',
    'ENCR': 'encryptionMethodRegistration',
    'EQUA': 'equalisation',
    'EQU2': 'equalisation2',
    'ETCO': 'eventTimingCodes',
    'GEOB': 'generalEncapsulatedObject',
    'GRID': 'groupIdentificationRegistration',
    'IPLS': 'involvedPeopleList',
    'LINK': 'linkedInformation',
    'MCDI': 'musicCDIdentifier',
    'MLLT': 'MPEGLocationLookupTable',
    'OWNE': 'ownership',
    'PRIV': 'private',
    'PCNT': 'playCounter',
    'POPM': 'popularimeter',
    'POSS': 'positionSynchronisationFrame',
    'RBUF': 'recommendedBufferSize',
    'RVA2': 'relativeVolumeAdjustment2',
    'RVAD': 'RelativeVolumeAdjustment',
    'RVRB': 'reverb',
    'SEEK': 'seek',
    'SIGN': 'signature',
    'SYLT': 'synchronisedLyric',
    'SYTC': 'synchronisedTempoCodes',
    'TALB': 'album',
    'TBPM': 'bpm',
    'TCOM': 'composer',
    'TCON': 'contentType',  // AKA genre
    'TCOP': 'copyright',
    'TDAT': 'date',
    'TDEN': 'decodingTime',
    'TDLY': 'playlistDelay',
    'TDOR': 'originalReleaseTime',
    'TEXT': 'textWriter',
    'TDRC': 'recordingTime',
    'TDRL': 'releaseTime',
    'TDTG': 'taggingTime',
    'TENC': 'encodedBy',
    'TFLT': 'fileType',
    'TIPL': 'involvedPeopleList',
    'TIME': 'time',
    'TIT1': 'contentGroup',
    'TIT2': 'title',
    'TIT3': 'subtitle',
    'TKEY': 'initialKey',
    'TLAN': 'language',
    'TLEN': 'length',
    'TMCL': 'musicianCreditsList',
    'TMED': 'mediaType',
    'TMOO': 'mood',
    'TOAL': 'originalTitle',
    'TOFN': 'originalFilename',
    'TOLY': 'originalTextwriter',
    'TOPE': 'originalArtist',
    'TORY': 'originalYear',
    'TOWN': 'fileOwner',
    'TPE1': 'artist',
    'TPE2': 'performerInfo',
    'TPE3': 'conductor',
    'TPE4': 'remixArtist',
    'TPOS': 'partOfSet',
    'TPRO': 'producedNotice',
    'TPUB': 'publisher',
    'TRCK': 'trackNumber',
    'TRDA': 'recordingDates',
    'TRSN': 'internetRadioName',
    'TRSO': 'internetRadioOwner',
    'TSOA': 'albumSortOrder',
    'TSOP': 'performerSortOrder',
    'TSOT': 'titleSortOrder',
    'TSIZ': 'size',
    'TSRC': 'ISRC',
    'TSSE': 'encodingTechnology',
    'TSST': 'setSubtitle',
    'TYER': 'year',
    'TXXX': 'userDefinedText',
    'UFID': 'uniqueFileIdentifier',
    'USER': 'termsOfUse',
    'USLT': 'unsynchronisedLyricTranscription',
    'WCOM': 'commercialInformationURL',
    'WCOP': 'copyrightInformationURL',
    'WOAF': 'officialAudioFileURL',
    'WOAR': 'officialArtistURL',
    'WOAS': 'officialAudioSourceURL',
    'WORS': 'officialInternetRadioStationURL',
    'WPAY': 'paymentURL',
    'WPUB': 'publisherURL',
    'WXXX': 'userDefinedURL',
    'BUF' : 'recommendedBufferSize',
    'CNT' : 'playCounter',
    'COM' : 'comment',
    'CRA' : 'audioEncryption',
    'CRM' : 'encryptedMeta',
    'ETC' : 'eventTimingCodes',
    'EQU' : 'equalization',
    'GEO' : 'generalEncapsulatedObject',
    'IPL' : 'involvedPeopleList',
    'LNK' : 'linkedInformation',
    'MCI' : 'musicCDIdentifier',
    'MLL' : 'MPEGLocationLookupRable',
    'PIC' : 'attachedPicture',
    'POP' : 'popularimeter',
    'REV' : 'reverb',
    'RVA' : 'relativeVolumeAdjustment',
    'SLT' : 'synchronizedLyrics',
    'STC' : 'syncedTempoCodes',
    'TAL' : 'album',
    'TBP' : 'bpm',
    'TCM' : 'composer',
    'TCO' : 'contentType',
    'TCR' : 'copyrightMessage',
    'TDA' : 'date',
    'TDY' : 'playlistDelay',
    'TEN' : 'encodedBy',
    'TFT' : 'fileType',
    'TIM' : 'time',
    'TKE' : 'initialKey',
    'TLA' : 'language',
    'TLE' : 'length',
    'TMT' : 'mediaType',
    'TOA' : 'originalArtist',
    'TOF' : 'originalFilename',
    'TOL' : 'originalTextwriter',
    'TOR' : 'originalReleaseYear',
    'TOT' : 'originalAlbumTitle',
    'TP1' : 'leadArtist',
    'TP2' : 'band',
    'TP3' : 'conductorRefinement',
    'TP4' : 'interpretedBy',
    'TPA' : 'partOfSet',
    'TPB' : 'publisher',
    'TRC' : 'ISRC',
    'TRD' : 'recordingDates',
    'TRK' : 'trackNumber',
    'TSI' : 'size',
    'TSS' : 'softwareHardwareEncoder',
    'TT1' : 'contentGroupDescription',
    'TT2' : 'titleDescription',
    'TT3' : 'subtitleRefinement',
    'TXT' : 'textwriter',
    'TXX' : 'userDefinedText',
    'TYE' : 'year',
    'UFI' : 'uniqueFileIdentifier',
    'ULT' : 'unsychronizedLyricTranscription',
    'WAF' : 'officialAudioFileURL',
    'WAR' : 'officialArtistURL',
    'WAS' : 'officialAudioSourceURL',
    'WCM' : 'commercialInformationURL',
    'WCP' : 'copyrightInformationURL',
    'WPB' : 'publisherURL',
    'WXX' : 'userDefinedURL'
  },

  LYRICSNAME: {
    'IND': 'lyrIndications',
    'EAL': 'lyrAlbum',
    'EAR': 'lyrArtist',
    'ETT': 'lyrTitle',
    'INF': 'lyrInfo',
    'AUT': 'lyrAuthor',
    'IMG': 'lyrImages',
    'LYR': 'lyrLyrics'
  },

  VERSIONS: {
    0x0100: 1.0,
    0x0101: 1.1,
    0x0200: 2.2,
    0x0300: 2.3,
    0x0400: 2.4
  },

  GENRES: [  // lookup using byte value as index
    'Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge', 'Hip-Hop', 'Jazz', 'Metal',
    'New Age', 'Oldies', 'Other', 'Pop', 'R&B', 'Rap', 'Reggae', 'Rock', 'Techno', 'Industrial', 'Alternative',
    'Ska', 'Death Metal', 'Pranks', 'Soundtrack', 'Euro-Techno', 'Ambient', 'Trip-Hop', 'Vocal', 'Jazz+Funk',
    'Fusion', 'Trance', 'Classical', 'Instrumental', 'Acid', 'House', 'Game', 'Sound Clip', 'Gospel', 'Noise',
    'AlternRock', 'Bass', 'Soul', 'Punk', 'Space', 'Meditative', 'Instrumental Pop', 'Instrumental Rock',
    'Ethnic', 'Gothic', 'Darkwave', 'Techno-Industrial', 'Electronic', 'Pop-Folk', 'Eurodance', 'Dream',
    'Southern Rock', 'Comedy', 'Cult', 'Gangsta Rap', 'Top 40', 'Christian Rap', 'Pop / Funk', 'Jungle',
    'Native American', 'Cabaret', 'New Wave', 'Psychedelic', 'Rave', 'Showtunes', 'Trailer', 'Lo-Fi', 'Tribal',
    'Acid Punk', 'Acid Jazz', 'Polka', 'Retro', 'Musical', 'Rock & Roll', 'Hard Rock', 'Folk', 'Folk-Rock',
    'National Folk', 'Swing', 'Fast Fusion', 'Bebob', 'Latin', 'Revival', 'Celtic', 'Bluegrass', 'Avantgarde',
    'Gothic Rock', 'Progressive Rock', 'Psychedelic Rock', 'Symphonic Rock', 'Slow Rock', 'Big Band', 'Chorus',
    'Easy Listening', 'Acoustic', 'Humour', 'Speech', 'Chanson', 'Opera', 'Chamber Music', 'Sonata', 'Symphony',
    'Booty Bass', 'Primus', 'Porn Groove', 'Satire', 'Slow Jam', 'Club', 'Tango', 'Samba', 'Folklore', 'Ballad',
    'Power Ballad', 'Rhythmic Soul', 'Freestyle', 'Duet', 'Punk Rock', 'Drum Solo', 'A Cappella', 'Euro-House',
    'Dance Hall', 'Goa', 'Drum & Bass', 'Club-House', 'Hardcore', 'Terror', 'Indie', 'BritPop', 'Negerpunk',
    'Polsk Punk', 'Beat', 'Christian Gangsta Rap', 'Heavy Metal', 'Black Metal', 'Crossover',
    'Contemporary Christian', 'Christian Rock', 'Merengue', 'Salsa', 'Thrash Metal', 'Anime', 'JPop', 'Synthpop',
    'Abstract', 'Art Rock', 'Baroque', 'Bhangra', 'Big Beat', 'Breakbeat', 'Chillout', 'Downtempo', 'Dub', 'EBM',
    'Eclectic', 'Electro', 'Electroclash', 'Emo', 'Experimental', 'Garage', 'Global', 'IDM', 'Illbient',
    'Industro-Goth', 'Jam Band', 'Krautrock', 'Leftfield', 'Lounge', 'Math Rock', 'New Romantic', 'Nu-Breakz',
    'Post-Punk', 'Post-Rock', 'Psytrance', 'Shoegaze', 'Space Rock', 'Trop Rock', 'World Music', 'Neoclassical',
    'Audiobook', 'Audio Theatre', 'Neue Deutsche Welle', 'Podcast', 'Indie Rock', 'G-Funk', 'Dubstep',
    'Garage Rock', 'Psybient'
  ],

  PICTYPE: [
    'Other',
    '32x32 pixels file icon (PNG only)',
    'Other file icon',
    'Cover (front)',
    'Cover (back)',
    'Leaflet page',
    'Media',
    'Lead artist/lead performer/soloist',
    'Artist/performer',
    'Conductor',
    'Band/Orchestra',
    'Composer',
    'Lyricist/text writer',
    'Recording Location',
    'During recording',
    'During performance',
    'Movie/video screen capture',
    'A bright coloured fish',
    'Illustration',
    'Band/artist logotype',
    'Publisher/Studio logotype'
  ],

  OPTIMIZE: {
    LISTENING: 0, // basic information
    CLUBDJ   : 1, // + bpm, dB, user def. texts
    RADIODJ  : 2, // + comments, user def URLs
    MINIMIZE : 3, // only optimnizes strings, removes empty tags etc.
    CUSTOM   : 9  // provide frame list to keep, optimizes strings
  },

  TAGTYPE: {
    'ID3V10'   : 1 << 0,
    'ID3V11'   : 1 << 1,
    'ID3V22'   : 1 << 2,
    'ID3V23'   : 1 << 3,
    'ID3V24'   : 1 << 4,
    'APEV1'    : 1 << 6,
    'APEV2'    : 1 << 7,
    'LYRICS3V1': 1 << 10,
    'LYRICS3V2': 1 << 11,
    'VORBIS'   : 1 << 12,
    'ANY'      : 0xffffffff
  },

  ENCTYPE: {
    0: 'latin1',
    1: 'utf16le',   // BOM
    2: 'utf16be', // BE, no BOM
    3: 'utf8'
  }

  // MOODS: []

  /*MEDIATYPE: {};
      DIG    Other digital media
        /A    Analogue transfer from media

      ANA    Other analogue media
        /WAC  Wax cylinder
        /8CA  8-track tape cassette

      CD     CD
        /A    Analogue transfer from media
        /DD   DDD
        /AD   ADD
        /AA   AAD

      LD     Laserdisc

      TT     Turntable records
        /33    33.33 rpm
        /45    45 rpm
        /71    71.29 rpm
        /76    76.59 rpm
        /78    78.26 rpm
        /80    80 rpm

      MD     MiniDisc
        /A    Analogue transfer from media

      DAT    DAT
        /A    Analogue transfer from media
        /1    standard, 48 kHz/16 bits, linear
        /2    mode 2, 32 kHz/16 bits, linear
        /3    mode 3, 32 kHz/12 bits, non-linear, low speed
        /4    mode 4, 32 kHz/12 bits, 4 channels
        /5    mode 5, 44.1 kHz/16 bits, linear
        /6    mode 6, 44.1 kHz/16 bits, 'wide track' play

      DCC    DCC
        /A    Analogue transfer from media

      DVD    DVD
        /A    Analogue transfer from media

      TV     Television
        /PAL    PAL
        /NTSC   NTSC
        /SECAM  SECAM

      VID    Video
        /PAL    PAL
        /NTSC   NTSC
        /SECAM  SECAM
        /VHS    VHS
        /SVHS   S-VHS
        /BETA   BETAMAX

      RAD    Radio
        /FM   FM
        /AM   AM
        /LW   LW
        /MW   MW

      TEL    Telephone
        /I    ISDN

      MC     MC (normal cassette)
        /4    4.75 cm/s (normal speed for a two sided cassette)
        /9    9.5 cm/s
        /I    Type I cassette (ferric/normal)
        /II   Type II cassette (chrome)
        /III  Type III cassette (ferric chrome)
        /IV   Type IV cassette (metal)

      REE    Reel
        /9    9.5 cm/s
        /19   19 cm/s
        /38   38 cm/s
        /76   76 cm/s
        /I    Type I cassette (ferric/normal)
        /II   Type II cassette (chrome)
        /III  Type III cassette (ferric chrome)
        /IV   Type IV cassette (metal)
  */
};
