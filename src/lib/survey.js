export const SURVEY_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeBE0RSHIB0iUmZKK56KoEg184STUcPGJG2i3y_OR29yqZ2WA/viewform'

export function surveyUrl(code) {
  return SURVEY_URL + '?usp=pp_url&entry.721134319=' + encodeURIComponent(code)
}

export function isSurveyDone() {
  try {
    return localStorage.getItem('popkkus.survey.v1') === 'true'
  } catch (e) {
    return false
  }
}

export function markSurveyDone() {
  try {
    localStorage.setItem('popkkus.survey.v1', 'true')
  } catch (e) {
    // ignore
  }
}
