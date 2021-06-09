import { GetStaticPaths, GetStaticProps } from 'next';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import Header from '../../components/Header';
import PrismicDOM from 'prismic-dom';
import { useRouter } from 'next/router';
import React, { useMemo } from 'react';

import { getPrismicClient } from '../../services/prismic';
import Prismic from '@prismicio/client'

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    estimated_time: number;
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Carregando...</div>
  }

  const estimatedTime = useMemo(() => {
    if (router.isFallback) {
      return 0;
    }

    const wordsPerMinute = 200;

    const contentWords = post.data.content.reduce((summedContent, currentContent) => {
      const headingWords = currentContent.heading.split(/\s/g).length;
      const bodyWords = currentContent.body.reduce((summedBodies, currentBody) => {
        const textWords = currentBody.text.split(/\s/g).length;

        return summedBodies + textWords;
      }, 0)

      return summedContent + headingWords + bodyWords;
    }, 0);

    const minutes = contentWords / wordsPerMinute;
    const readingTime = Math.ceil(minutes)

    return readingTime;
  }, [post, router.isFallback])

  return (
    <>
      <Header />

      <section
        className={styles.banner}
        data-testid="banner"
        style={{ backgroundImage: `url(${post.data.banner.url})` }}
      />

      <main className={`${commonStyles.contentContainer} ${styles.post}`}>
        <article>
          <h1>{post.data.title}</h1>

          <section>
            <div>
              <FiCalendar />
              <span>{format(
                new Date(post.first_publication_date),
                'dd MMM yyyy',
                {
                  locale: ptBR
                }
              )}</span>
            </div>
            <div>
              <FiUser />
              <span>{post.data.author}</span>
            </div>
            <div>
              <FiClock />
              <span>{estimatedTime} min</span>
            </div>
          </section>

          <div>
            {post.data.content.map(post => {
              return (
                <React.Fragment key={post.heading}>
                  <h2>{post.heading}</h2>

                  <div
                    dangerouslySetInnerHTML={{ __html: PrismicDOM.RichText.asHtml(post.body) }}
                  />
                </React.Fragment>
              );
            })}
          </div>
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts')
  ]);

  const paths = posts.results.map(post => ({
    params: { slug: post.uid }
  }))

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const prismic = getPrismicClient();
  const { slug } = params;

  const response = await prismic.getByUID('posts', String(slug), {});

  return {
    props: {
      post: response
    },
    revalidate: 60 * 60 * 24 // 24 hours
  }
};
