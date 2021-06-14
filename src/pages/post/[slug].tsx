import { GetStaticPaths, GetStaticProps } from 'next';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import Header from '../../components/Header';
import PrismicDOM from 'prismic-dom';
import { useRouter } from 'next/router';
import React from 'react';

import { getPrismicClient } from '../../services/prismic';
import Prismic from '@prismicio/client'

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Comments from '../../components/Comments';
import Link from 'next/link';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PreviewPost {
  title: string;
  slug: string;
}

interface PostProps {
  post: Post;
  preview: boolean;
  prevPost: PreviewPost | null;
  nextPost: PreviewPost | null;
}

export default function Post({
  post,
  preview,
  prevPost,
  nextPost,
}: PostProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Carregando...</div>
  }

  function calculateReadTime() {
    if (router.isFallback) {
      return 0;
    }

    const wordsPerMinute = 200;

    const contentWords = post.data.content.map(word => {
      if (word.heading) {
        return [
          ...word.heading.split(' '),
          ...word.body.map(bodyWords => {
            if (bodyWords.text) {
              return [...bodyWords.text.split(' ')];
            }
          })
        ]
      }
    }).flat();

    const totalWords = contentWords.flat().length;

    const minutes = totalWords / wordsPerMinute;
    const readingTime = Math.round(minutes)

    return readingTime;
  }

  const estimatedTime = calculateReadTime();

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
              )}
              </span>
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
          <section className={styles.lastEdition}>
            {format(
              new Date(post.last_publication_date),
              "'*editado em' d MMM yyyy, 'às' HH:mm",
              {
                locale: ptBR
              }
            )}
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

      <footer className={`${commonStyles.contentContainer} ${styles.footer}`}>
        <hr className={styles.divider} />

        <div className={styles.postControllers}>
          {prevPost && (
            <div>
              <Link href={`/post/${prevPost.slug}`}>
                <a>{prevPost.title}</a>
              </Link>
              <p>Post anterior</p>
            </div>
          )}

          {nextPost && (
            <div>
              <Link href={`/post/${nextPost.slug}`}>
                <a>{nextPost.title}</a>
              </Link>
              <p>Próximo post</p>
            </div>
          )}
        </div>

        <Comments />

        {preview && (
          <aside className={styles.exitPreview}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </footer>
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

export const getStaticProps: GetStaticProps = async ({ params, preview = false, previewData }) => {
  const prismic = getPrismicClient();
  const { slug } = params;

  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null
  });

  const prevPostResponse = (await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ], {
    pageSize: 1,
    after: response.id,
    orderings: '[document.first_publication_date]'
  })).results[0];

  const nextPostResponse = (await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ], {
    pageSize: 1,
    after: response.id,
    orderings: '[document.first_publication_date desc]'
  })).results[0];

  return {
    props: {
      post: response,
      preview,
      prevPost: prevPostResponse ? {
        title: prevPostResponse.data.title,
        slug: prevPostResponse.uid
      } : null,
      nextPost: nextPostResponse ? {
        title: nextPostResponse.data.title,
        slug: nextPostResponse.uid
      } : null
    },
    revalidate: 60 * 60 * 24 // 24 hours
  }
};
