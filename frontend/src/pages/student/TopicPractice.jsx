import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Topbar from '../../components/layout/Topbar';
import { STUDENT_NAV } from '../../components/layout/navConfig';
import topicService from '../../services/topicService';
import { IconSearch, IconArrowRight } from '../../components/icons/Icon';
import styles from './TopicPractice.module.css';

// Rich fallback descriptions if DB topic description is empty
const TOPIC_DESCRIPTIONS = {
  'averages, ratios & mixtures': 'Ratios, proportions, weighted averages, alligation & mixture problems',
  'blood relations & directions': 'Family trees, relationships, directional compass, distance & orientation',
  'clocks & calendars': 'Hand angles, gain/loss of time, leap years, day of the week calculations',
  'data interpretation': 'Bar graphs, pie charts, tables, line graphs, data sufficiency',
  'logical deduction & syllogisms': 'Syllogisms, Venn diagrams, statements & conclusions, logical flow',
  'number systems & series': 'LCM, HCF, divisibility, remainder theorem, number series',
  'percentages & profit/loss': 'Percentage calculations, profit, loss, discount, markup',
  'permutations & probability': 'Combinations, arrangements, probability of events, dice, cards',
  'time, speed & distance': 'Speed, distance, time, trains, boats, streams, relative motion',
  'work & time': 'Work efficiency, pipes, cisterns, combined work calculations',
};

const TopicPractice = () => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await topicService.getTopics();
        setTopics(data || []);
      } catch {
        setError('Unable to load topics right now.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredTopics = useMemo(() => {
    if (!search.trim()) return topics;
    const q = search.toLowerCase().trim();
    return topics.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [topics, search]);

  const getDescription = (topic) => {
    if (topic.description && topic.description.trim() && topic.description !== 'Adaptive practice') {
      return topic.description;
    }
    const key = topic.name.toLowerCase().trim();
    return TOPIC_DESCRIPTIONS[key] || 'Comprehensive adaptive practice module covering fundamentals to advanced problems.';
  };

  return (
    <DashboardLayout navItems={STUDENT_NAV} subtitle="TOPIC PRACTICE">
      <Topbar
        title="Topic Practice Directory"
        subtitle="Target individual domains. The adaptive engine recalibrates difficulty after every 5-question batch."
        showSearch={false}
        showTargetBadge={false}
      />

      <div className={styles.container}>
        {/* Search & Filter Bar */}
        <div className={styles.filterRow}>
          <div className={styles.searchBox}>
            <IconSearch width={16} height={16} />
            <input
              type="text"
              placeholder="Search aptitude topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button className={styles.modulesFilterBtn}>
            All Modules ({filteredTopics.length})
          </button>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className={styles.stateNotice}>Loading practice modules…</div>
        ) : error ? (
          <div className={styles.errorNotice}>{error}</div>
        ) : filteredTopics.length === 0 ? (
          <div className={styles.stateNotice}>
            No topics matched "{search}". Try another search term.
          </div>
        ) : (
          /* 3-Column Topic Cards Grid */
          <div className={styles.grid}>
            {filteredTopics.map((t) => (
              <div key={t.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.brainIconBox}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0-4 4v3a4 4 0 0 0 4 4v1a4 4 0 0 0 8 0v-1a4 4 0 0 0 4-4v-3a4 4 0 0 0-4-4V6a4 4 0 0 0-4-4z"/>
                      <path d="M12 6v14"/>
                      <path d="M7 10h10"/>
                    </svg>
                  </div>
                  <div className={styles.difficultyPills}>
                    <span className={styles.pillEasy}>Easy</span>
                    <span className={styles.pillMed}>Med</span>
                    <span className={styles.pillHard}>Hard</span>
                  </div>
                </div>

                <h3 className={styles.cardTitle}>{t.name}</h3>
                <p className={styles.cardDesc}>{getDescription(t)}</p>

                <div className={styles.cardFooter}>
                  <span className={styles.setInfo}>Adaptive 20-Q Set</span>
                  <button
                    className={styles.startBtn}
                    onClick={() =>
                      navigate('/adaptive', {
                        state: { topicId: t.id, topicName: t.name },
                      })
                    }
                  >
                    <span>Start Practice</span>
                    <IconArrowRight width={13} height={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TopicPractice;
