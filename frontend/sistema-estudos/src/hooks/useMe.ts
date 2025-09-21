import { useQuery } from '@tanstack/react-query';
import { QueryKeys, queryFetchers } from '../apiClient';

export function useMe() {
  const query = useQuery({
    queryKey: QueryKeys.me,
    queryFn: queryFetchers.me,
  });
  return query; // { data, error, isLoading, ... }
}
