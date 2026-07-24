import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import memeStory from '../assets/graphics/figma-v2/meme-story-exact.png';
import './FinalCTA.css';

function FinalCTA() {
  const storyRef = useRef(null);
  const [storyHasMore, setStoryHasMore] = useState(true);

  useEffect(() => {
    const story = storyRef.current;
    if (!story) return undefined;

    const updateStoryIndicator = () => {
      const remainingScroll = story.scrollHeight - story.clientHeight - story.scrollTop;
      setStoryHasMore(remainingScroll > 2);
    };

    updateStoryIndicator();

    const resizeObserver = new ResizeObserver(updateStoryIndicator);
    resizeObserver.observe(story);

    return () => resizeObserver.disconnect();
  }, []);

  const scrollStory = () => {
    storyRef.current?.scrollBy({
      top: storyRef.current.clientHeight * 0.72,
      behavior: 'smooth',
    });
  };

  return (
    <section className="final-cta" id="apply" data-nav-tone="cream" data-nav-bg="#7979e3">
      <div className="final-cta__inner">
        <div className="final-cta__left">
          <div className="meme-story">
            <img
              className="meme-story-art"
              src={memeStory}
              alt=""
              width={548}
              height={485}
              aria-hidden="true"
            />
            <article className="meme-story__panel" aria-label="A Good Meme Story">
              <h2 className="meme-story__title">A Good Meme Story</h2>
              <div
                className="meme-story__scroll"
                ref={storyRef}
                onScroll={() => {
                  const story = storyRef.current;
                  if (!story) return;
                  setStoryHasMore(story.scrollHeight - story.clientHeight - story.scrollTop > 2);
                }}
                tabIndex="0"
              >
                <p>Sometimes, a meme appears in your feed and you don&apos;t even laugh.</p>
                <p>You just nod.</p>
                <p>Because it gets you.</p>
                <p>It speaks your language before you knew you had one.</p>
                <p>It&apos;s not selling.</p>
                <p>It&apos;s not shouting.</p>
                <p>It&apos;s not explaining.</p>
                <p>It&apos;s simply familiar.</p>
                <p>
                  And in that brief moment of recognition, you feel part of something invisible,
                  electric and real.
                </p>
                <p>The moment information becomes understanding.</p>
                <p>Understanding becomes participation.</p>
                <p>They share it because it feels true.</p>
                <p>That is what interests us.</p>
                <p>Not virality.</p>
                <p>Understanding.</p>
              </div>
              <button
                className={`meme-story__scroll-cue${storyHasMore ? '' : ' is-hidden'}`}
                type="button"
                onClick={scrollStory}
                aria-label="Continue reading the meme story"
                tabIndex={storyHasMore ? 0 : -1}
              >
                <span aria-hidden="true" />
              </button>
            </article>
          </div>
        </div>
        <div className="final-cta__right">
          <p className="final-cta__resonate">If this resonates, we can work together.</p>
          <div className="final-cta__block">
            <p>Apply for the</p>
            <Link to="/application-form" className="final-cta__btn final-cta__btn--solid">
              Memetic Brand Workshop
            </Link>
          </div>
          <div className="final-cta__block">
            <p>Try the beta version</p>
            <a href="#narrative-engine" className="final-cta__btn final-cta__btn--outline">
              Narrative Engine
            </a>
          </div>
        </div>
        <p className="final-cta__tagline">
          Communication Intelligence for Emerging Technology Companies.
          <br />
          <em>Powered by Memetic Systems.</em>
        </p>
      </div>
    </section>
  );
}

export default FinalCTA;
